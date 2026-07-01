# Project Context: Waptrix

## Overview
Waptrix is a professional SaaS platform for WhatsApp Bulk Messaging, built with a modern web stack, integrated with Meta's WhatsApp Business API, and maintained for high reliability.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS (with support for Dark and Light modes)
- **Database/Auth**: Supabase (PostgreSQL)
- **API Integration**: Meta WhatsApp Business API v22.0, Resend (Email)
- **Deployment**: Vercel
- **State Management**: React Hooks, Context API (TenantContext), & Server Components

## Core Architecture
- **(dashboard)**: Grouped route containing all authenticated user pages (Analytics, Connect, Campaigns, Contacts, etc.).
- **TenantContext**: Shared client-side state for authenticated user profiles and messaging quotas.
- **Middleware**: Handles authentication redirects via Supabase SSR, with explicit exclusions for public routes (login, signup, terms, privacy, password recovery, `/api/auth/` endpoint routes, and `/api/webhooks/`).
- **Client/Server Libs**: Unified Supabase clients in `src/lib/supabase`, Meta API helpers in `src/lib/meta.ts`, and Resend email utilities in `src/lib/email`.
- **API Authentication & RLS Bypass Standard**: Database operations in Next.js API Route Handlers authenticate users using the cookie-reliable `supabase.auth.getUser()`. Query operations are performed using a Supabase `service_role` client to bypass RLS, utilizing manual tenant-level filtering by `user.id`. API request bodies normalize camelCase and snake_case parameters (e.g. `templateId` and `template_id`) seamlessly to ensure robust client and schema alignment.
- **Light/Dark Mode & Theme Toggle**: Integrated light and dark theme styling using CSS variables. Default is light mode. Theme toggling is supported via a UI toggle button in the `Topbar.tsx` component which syncs selection to `localStorage`. An inline script in `layout.tsx` runs before paint to prevent theme flash (FOUC) by loading the correct class on the root element.

## Key Integration
- **Meta Embedded Signup & Token Rotation**: Custom flow utilizing `NEXT_PUBLIC_META_CONFIG_ID`. Employs direct accessToken storage (`/api/whatsapp/store-token`) during `FB.login` and auto-discovers verified assets via `/api/whatsapp/connect` or `/api/whatsapp/sync-connection` using dual WABA/business lookup methods. Access tokens are immediately exchanged for 60-day long-lived tokens. The system automatically monitors and updates token lifecycles via a daily cron endpoint `/api/cron/refresh-tokens` for tokens expiring within 10 days, recording `token_expires_at` in the `wa_connections` database.
- **Campaign Wizard & Background Dispatcher**: Endpoints at `/api/campaigns` manage draft, scheduled, and immediate campaigns. Launching an immediate campaign leverages Vercel `waitUntil` to process and dispatch messages in the background asynchronously without blocking the client. A shared campaign runner utility `src/lib/campaign-sender.ts` manages segment processing, variable substitution, and inbox thread syncing. A minute-by-minute worker cron at `/api/worker/campaigns` (secured via `CRON_SECRET`) picks up pending scheduled campaigns, flags them as queued to avoid concurrency race conditions, and triggers execution. Delivery/read webhook status updates dynamically track stats, while failed webhooks increment failure counts and subtract from active sent counts. Detailed sandbox errors are logged to `message_logs`.
- **Contacts & Niche Library**: Advanced dashboard at `/contacts` managing all user audience sheets and niches. Features a unified right-sliding `CreateContactsDrawer` for manual additions and drag-and-drop Excel/CSV spreadsheet upload with a full-screen column mapping interface (supporting separate per-row country code column mapping or a default bulk fallback country code selector dropdown, stripping leading zeros and pre-pending resolved codes properly; providing a country code is now required). Added downloadable sample CSV, expandable instructions, and advanced fields: User ID (`custom1`), Tags (`custom2`), WhatsApp Opted (`opted_in`), and Location (`custom3` as serialized JSON). Enables on-the-fly niche creation during uploads, real-time count badges, and a comprehensive 'Niche & List Library' modal allowing for easy sheet renaming and safe cascading deletions. Existing contacts are overwritten/updated in-place on conflict using database-level upserting on phone records. Includes a segments filter dropdown and tags filter dropdown (migrating to a full-width contacts table instead of the previous left sidebar niche layout), a separate country code column displaying parsed phone country codes, a WhatsApp redirect button that navigates directly to the `/inbox?phone=...` route, a "Manage Segments" button to trigger the Segment/List library modal, a CSV contacts exporter, interactive column sorting, and floating bulk action controls bar.
- **Webhooks**: Automated status event handling at `/api/webhooks/meta` verifying payload signatures via HMAC SHA-256 using `META_APP_SECRET`. Parses incoming delivery updates, updates message status fields in both `chat_messages` and `message_logs` tables, and increments associated campaign delivery counts (`delivered_count`/`read_count`). Also processes incoming WhatsApp message types (text, interactive buttons, image, audio, video, document), dynamically mapping incoming events to local threads.
- **Dynamic Analytics & Cross-Route Action Panel**: Unified analytics aggregation route `/api/analytics` fetches campaign delivery indices and chronological message logs, extending metrics to cover total delivered and failed logs. The dashboard home page `/` and the detailed `/analytics` route both fetch live metrics and campaign performance dynamically, utilizing local react hooks and fallback mock metrics to maintain visual excellence. Interactive triggers on the home dashboard wire action clicks to navigate seamlessly to deep nested page modal dialogs (Campaign Wizard, Import CSV drawer) via lightweight client URL hash filters.
- **Real-time Conversational Inbox & New Chat Initiation**:
  - Dedicated interactive `/inbox` route using the glassmorphic `InboxPanel` component.
  - Backed by the local `InboxContext` and Supabase Realtime replication to push live message indicators and content changes to the client.
  - Managed by five specific API routes: fetching conversation lists (`/api/conversations`), listing messages (`/api/conversations/[id]/messages`), marking read threads (`/api/conversations/[id]/mark-read`), sending replies (`/api/conversations/[id]/reply`), and initiating new conversation threads (`/api/conversations/start`).
  - Supports template selection and dynamic text replies with full attachment mime type mapping.
  - Supports auto-selecting matching active conversations on mount using the `initialPhone` property passed via search parameters (`/inbox?phone=...`).
  - Integrated a "New Chat" button and modal inside `InboxPanel` to initiate new conversations. Since Meta requires the first message to be an approved template, the modal prompts for a destination phone number, target template selection, and dynamic template variable inputs before calling `/api/conversations/start` to dispatch and create/reuse threads.
  - Template names are automatically normalized to lowercase and underscores (specifically replacing whitespace with underscores and stripping invalid punctuation chars) on Meta template submission (`/api/templates/[id]/submit`) and during message dispatch (reply/start endpoints) to prevent Meta API template name mismatch errors (such as error 132001).
  - Dynamically extracts parameter variables (e.g., `{{1}}`, `{{2}}`) from template body texts inside `InboxPanel`, rendering interactive input fields in both the Template Reply pane and the New Chat modal to validate and send body text parameters correctly (preventing Meta API error 132000).
  - Renders outbound WhatsApp template messages visually inside the message log thread using a custom `TemplateBubble` component in `InboxPanel.tsx` (displaying template media headers, body message paragraphs, footers, and interactive action buttons natively instead of a raw `[Template: name]` string).
- **WhatsApp Business Profile Management**:
  - Integrated a dedicated settings pane on the `/settings` route to display active connection status, synced official business names, phone numbers, and last sync times.
  - Created `/api/whatsapp/profile` (GET to retrieve business details, and POST to update status/bio fields) interacting directly with Meta Graph API.
  - Created `/api/whatsapp/profile/picture` (POST to upload JPEG/PNG avatar assets up to 5MB, register the resulting media handle with Meta, and set it as the WhatsApp Business Profile picture).
- **Landing Page & Error Resilience**:
  - Implemented a fully responsive, SEO-optimized landing page at `public/index.html` styling the site to match the dark glassmorphic design token system.
  - Implemented frontend error boundaries across all dashboard pages (Analytics, Campaigns, Contacts, Templates, and Home dashboard) with user-friendly retry buttons, toast alerts, and launch boundaries.
  - Upgraded Campaign dispatcher logs to capture granular Meta error payloads (`[code] message`) and extended visual statuses to display distinct badges for `read`, `delivered`, `sent`, `failed`, and `queued` events.
- **WhatsApp Message Template Builder**:
  - Implemented a 2-step visual template builder wizard (`TemplateBuilder.tsx`) to create and register Meta WhatsApp templates.
  - Step 1: Category & Type selection interface with interactive mockup previews (Android/iOS toggle).
  - Step 2: Detailed content editor supporting headers (text with variable options or media attachments), body texts with variable inserts, language selector dropdowns, and button types (quick replies, link triggers, and marketing opt-out buttons).
  - Integrates a real-time syntax highlighting overlay for variable placeholders (`{{N}}`) in the body editor by layering a transparent textarea over a highlighted mirror container.
  - Added formatting buttons to automatically wrap selected texts in WhatsApp-compliant bold (`*bold*`) and italic (`_italic_`) modifiers, and embedded an interactive emoji picker toolbar.
  - Previews template body texts inside the `PhonePreview` using a parser (`renderWAText`) that renders bold (`*bold*`), italic (`_italic_`), strikethrough (`~strike~`), monospace code (`code`), and variables natively according to WhatsApp's formatting syntax, layered over a realistic WhatsApp chat wallpaper background.
  - Supports drag-and-drop file uploads in template builder image, video, and document header zones.
  - Automatically closes the TemplateBuilder modal upon successful submission, triggers a success toast notification, and maps the review status to "Under Review".
  - Enforces public HTTPS URLs for media headers, rejecting base64 data URLs in `/api/templates` and `/api/templates/[id]` to prevent database statement timeouts and Meta submission failures (client-side base64 block removed since API filters it automatically for format-only Meta submissions).
  - Prompts users with an unsaved changes confirmation dialog on close if they have edited any template fields in `TemplateBuilder.tsx`.
  - Resolves and separates media header URLs correctly from text headers when loading existing templates in edit mode.
  - Wraps local mock file uploads/previews (`addMedia` cache calls) in try-catch handlers to prevent browser `QuotaExceededError` exceptions from crashing the page.
  - Created a dedicated signed URL route `/api/upload-url` scoping files inside Supabase Storage `template-media` bucket (aligned to use standard cookie-reliable `createClient` helpers). This allows the client to PUT file binaries directly to Supabase Storage, bypassing Vercel's 4.5MB request size limits entirely.
  - Integrates a unified client-side upload handler `handleUpload` in `TemplateBuilder.tsx` to handle drag-and-drop or select file uploads with custom loaders and progress overlays, utilizing the signed URL client PUT flow.
  - Template API PUT/POST route handlers strip base64 data URLs silently before saving to DB to prevent DB statement timeouts. During Meta template submission (`/api/templates/[id]/submit`), media header assets are dynamically fetched and uploaded to Meta's Resumable Upload API (`/app/uploads`) to acquire a `header_handle` for the `example` payload (falling back to format-only submission on error), and the submission handler returns rich error diagnostics (`error_user_msg` and `error_subcode`) on failure.
- **Unified Media Library Management**:
  - Implemented `/media` and the `MediaLibrary.tsx` component to handle uploaded images, audio, video, and document attachments.
  - Displays dynamic file previews including custom video frame thumbnails and document extension badges (e.g. PDF, CSV).
  - Includes file size formatters that display exact storage footprints and prevent parsing failures.
  - Automatically classifies file attachments into specific groups (image, audio, video, document) in `/api/media/route.ts` and `MediaLibrary.tsx` by cross-referencing MIME types and filename extensions, resolving upload payloads and parsing issues.
  - Implemented a pulse-animated skeleton loader grid in `MediaLibrary.tsx` while fetching uploads to prevent brief flashes of empty folder states.
  - Lazy-loads card thumbnail previews dynamically via `GET /api/media/[id]` inside `LazyCard` after pulling only lightweight metadata list payloads from `GET /api/media` to keep lists under 10 KB regardless of file quantity or sizes.
  - Pre-seeds newly uploaded file thumbnails directly in the client cache (`thumbnailCache`) to allow immediate rendering without redundant API fetches.
  - Added a manual refresh button (`RefreshCw` icon) next to the file upload control to easily re-fetch assets.
  - Implemented a user-friendly fallback error state displaying details and a retry button if queries to `/api/media` fail or return non-array results.
  - Aligned `/api/media` route handler mapping variables safely to resolve metadata attributes, and excluded both `type` and `size` fields from insert queries since they are not present in this database schema (with size/type derived client-side instead).
  - Implemented a dismissible, inline warning banner in `MediaLibrary.tsx` to display upload failures (such as file size exceeding the 20MB limit or server exceptions) instead of browser `alert()` popups.
  - Cleaned up the `/media` page dashboard header by removing the redundant upload file modal trigger, centralizing uploads directly in the inline library container.
