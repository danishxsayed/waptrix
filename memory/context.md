# Project Context: Waptrix

## Overview
Waptrix is a professional SaaS platform for WhatsApp Bulk Messaging, built with a modern web stack, integrated with Meta's WhatsApp Business API, and maintained for high reliability.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
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

## Key Integration
- **Meta Embedded Signup & Token Rotation**: Custom flow utilizing `NEXT_PUBLIC_META_CONFIG_ID`. Employs direct accessToken storage (`/api/whatsapp/store-token`) during `FB.login` and auto-discovers verified assets via `/api/whatsapp/connect` or `/api/whatsapp/sync-connection` using dual WABA/business lookup methods. Access tokens are immediately exchanged for 60-day long-lived tokens. The system automatically monitors and updates token lifecycles via a daily cron endpoint `/api/cron/refresh-tokens` for tokens expiring within 10 days, recording `token_expires_at` in the `wa_connections` database.
- **Campaign Wizard & Background Dispatcher**: Endpoints at `/api/campaigns` manage draft, scheduled, and immediate campaigns. Launching an immediate campaign leverages Vercel `waitUntil` to process and dispatch messages in the background asynchronously without blocking the client. A shared campaign runner utility `src/lib/campaign-sender.ts` manages segment processing, variable substitution, and inbox thread syncing. A minute-by-minute worker cron at `/api/worker/campaigns` (secured via `CRON_SECRET`) picks up pending scheduled campaigns, flags them as queued to avoid concurrency race conditions, and triggers execution. Delivery/read webhook status updates dynamically track stats, while failed webhooks increment failure counts and subtract from active sent counts. Detailed sandbox errors are logged to `message_logs`.
- **Contacts & Niche Library**: Advanced dashboard at `/contacts` managing all user audience sheets and niches. Features quick inline creation, spreadsheet/drag-and-drop parser imports, real-time count badges, on-the-fly niche creation during uploads, and a comprehensive 'Niche & List Library' modal allowing for easy sheet renaming and safe cascading deletions.
- **Webhooks**: Automated status event handling at `/api/webhooks/meta` verifying payload signatures via HMAC SHA-256 using `META_APP_SECRET`. Parses incoming delivery updates, updates message status fields in both `chat_messages` and `message_logs` tables, and increments associated campaign delivery counts (`delivered_count`/`read_count`). Also processes incoming WhatsApp message types (text, interactive buttons, image, audio, video, document), dynamically mapping incoming events to local threads.
- **Dynamic Analytics & Cross-Route Action Panel**: Unified analytics aggregation route `/api/analytics` fetches campaign delivery indices and chronological message logs, extending metrics to cover total delivered and failed logs. The dashboard home page `/` and the detailed `/analytics` route both fetch live metrics and campaign performance dynamically, utilizing local react hooks and fallback mock metrics to maintain visual excellence. Interactive triggers on the home dashboard wire action clicks to navigate seamlessly to deep nested page modal dialogs (Campaign Wizard, Import CSV drawer) via lightweight client URL hash filters.
- **Real-time Conversational Inbox**:
  - Dedicated interactive `/inbox` route using the glassmorphic `InboxPanel` component.
  - Backed by the local `InboxContext` and Supabase Realtime replication to push live message indicators and content changes to the client.
  - Managed by four specific API routes: fetching conversation lists (`/api/conversations`), listing messages (`/api/conversations/[id]/messages`), marking read threads (`/api/conversations/[id]/mark-read`), and sending replies (`/api/conversations/[id]/reply`).
  - Supports template selection and dynamic text replies with full attachment mime type mapping.
- **WhatsApp Business Profile Management**:
  - Integrated a dedicated settings pane on the `/settings` route to display active connection status, synced official business names, phone numbers, and last sync times.
  - Created `/api/whatsapp/profile` (GET to retrieve business details, and POST to update status/bio fields) interacting directly with Meta Graph API.
  - Created `/api/whatsapp/profile/picture` (POST to upload JPEG/PNG avatar assets up to 5MB, register the resulting media handle with Meta, and set it as the WhatsApp Business Profile picture).
- **Landing Page & Error Resilience**:
  - Implemented a fully responsive, SEO-optimized landing page at `public/index.html` styling the site to match the dark glassmorphic design token system.
  - Implemented frontend error boundaries across all dashboard pages (Analytics, Campaigns, Contacts, Templates, and Home dashboard) with user-friendly retry buttons, toast alerts, and launch boundaries.
  - Upgraded Campaign dispatcher logs to capture granular Meta error payloads (`[code] message`) and extended visual statuses to display distinct badges for `read`, `delivered`, `sent`, `failed`, and `queued` events.
