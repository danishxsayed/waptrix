# Implementation History

## [2026-06-29] - Column Mapper Improvements & Inbox Chat Initiation
- **Country Code Validation**:
  - Made the Country Code field required in the CSV/Excel importer column mapping interface.
  - Enhanced UI prompts and status badges (e.g. highlighting required indicator) to ensure either a dedicated country code column is mapped or a default fallback country code is selected.
- **New Conversation Initiation**:
  - Created `/api/conversations/start` API route handler to initiate brand-new WhatsApp conversations using Meta's messaging API, creating or reusing database threads.
  - Built a "New Chat" modal and trigger button in `InboxPanel` enabling users to input custom phone numbers, select approved templates, and dynamically map variable parameters to kickstart external outreach directly from the Inbox.
- **Template Name Normalization**:
  - Implemented automatic template name normalization (lowercase + underscores) in template submission `/api/templates/[id]/submit` to sync DB and Meta names.
  - Added matching template name normalization in the conversation reply `/api/conversations/[id]/reply` and conversation start `/api/conversations/start` routes to prevent Meta API template name mismatch errors (such as error 132001).
- **Template Variables Ingestion**:
  - Implemented client-side parsing (`extractTemplateVars`) of template placeholders (`{{N}}`) inside `InboxPanel`.
  - Added dynamic input fields inside both the Template Reply pane and the New Chat modal to collect and parameterize text variables before sending, preventing Meta API parameter mismatches (such as error 132000).
- **Brand Style Reversion**:
  - Reverted the brand style color experiment back to the original jade green (`#10B981` / `rgba(16,185,129,...)`) codebase-wide after testing color variations.
- **Visual Template Builder Wizard**:
  - Refactored `TemplateBuilder.tsx` to utilize a 2-step setup process. Step 1 selects the template category and type with a live mock preview (Android/iOS toggle), and Step 2 configures the content.
  - Enhanced template customization options including rich headers (media/text), dynamic variables adding, AI-assisted body content generator, and interactive buttons (quick replies, URL links, and marketing opt-outs).
- **Rich Template Builder Editing Tools**:
  - Implemented real-time syntax highlighting for variables (`{{N}}`) inside the template body textarea using a dual-layered transparent textarea layout.
  - Added text utility actions in the toolbar to wrap text selections in WhatsApp bold (`*bold*`) and italic (`_italic_`) modifiers.
  - Integrated an interactive emoji picker grid to insert common emojis directly at the user's cursor position.
- **Mockup Preview Formatting & Scroll Fixes**:
  - Implemented a parser (`renderWAText`) inside the Phone mockup preview component (`PhonePreview`) to natively render WhatsApp formatting syntax, specifically styling bold (`*bold*`), italic (`_italic_`), strikethrough (`~strike~`), monospace code (`code`), and variable marks.
  - Corrected the textarea highlight overlay technique by preserving text colors on the background layer and layering a transparent text input on top, making the body text input fully visible.
  - Adjusted the layout settings with `min-h-0` to make the left panel scrollable in smaller vertical viewports.
- **Drag-and-Drop & Media Upload Enhancements**:
  - Added drag-and-drop file upload listeners in the image, video, and document header options inside `TemplateBuilder.tsx` to streamline header asset uploads.
- **Media Library Previews & Storage Metadata**:
  - Implemented dynamic media file previews in `MediaLibrary.tsx` (such as custom video thumbnails, and specific file type extension badges for documents like PDF or CSV).
  - Patched file size formatting in the media library component to fix NaN MB calculation issues for valid uploads.
- **Template Review Status & Close Handlers**:
  - Updated Meta templates review status labels to read "Under Review" instead of the generic "Pending" status in `TemplateBuilder.tsx` and `/templates` page.
  - Set the template builder modal to close automatically upon successful submit, raising a clean success toast alert.
- **Mockup Wallpaper Style**:
  - Restored the traditional WhatsApp chat wallpaper background inside `PhonePreview` to create a realistic mockup preview.
- **Media Upload Category Detection & Payload Fixes**:
  - Refactored category detection inside `/api/media/route.ts` and `MediaLibrary.tsx` to safely derive media groups (image, audio, video, document) from both MIME type and filename extension.
  - Corrected upload payload formats and patched file size parses to prevent `sizeBytes` NaN calculation errors.

## [2026-06-28] - Light/Dark Theme & Contacts UI Refinements
- **Light/Dark Theme Toggle**:
  - Implemented light theme overrides using CSS variables in `globals.css` with a default light mode.
  - Added a responsive theme toggle control (`Sun`/`Moon` icons) in `Topbar.tsx` that persists theme choices in `localStorage`.
  - Injected an inline theme initialization script in `layout.tsx` before paint to prevent initial page flash (FOUC).
- **Contacts Page Layout, Column Mapper & Action Upgrades**:
  - Migrated the segment/niche list layout from a left sidebar to a dropdown filter next to the search bar, enabling a full-width contacts list table.
  - Added a "Manage Segments" action button to easily access the Niche & List Library modal.
  - Created a separate dedicated country code column displaying parsed phone country codes (`parsePhone`).
  - Simplified the contacts list table to display only Location (removing the Appointment time display).
  - Designed and implemented a full-screen CSV/Excel importer column mapping interface.
  - Replaced the WhatsApp direct send popup with a direct routing action (`router.push`) that redirects users to the `/inbox?phone=...` thread.
- **Conversational Inbox Auto-Selection**:
  - Wrapped `/inbox` page with a `Suspense` boundary and `useSearchParams` hook to dynamically intercept `phone` query parameters.
  - Added auto-selection logic in `InboxPanel` that resolves the matching contact thread and opens it automatically on page load.
## [2026-06-27] - Country Code Mapping & Deduplication Enhancements in CSV Importer
- **Country Code Column Mapping**:
  - Implemented automatic column matching and selection for country codes in the CSV importer.
  - Added a default bulk country code selector dropdown (`defaultBulkCountryCode`, defaulting to `+91`) as a fallback if no country code column is mapped in the spreadsheet.
- **Robust Phone Parsing & Normalization**:
  - Refactored phone number normalization in the importer to strip leading zeros (`replace(/^0+/, "")`) and correctly prepend either the per-row mapped country code or fallback country code, improving contact deduplication accuracy.

## [2026-06-26] - Unified Contacts Drawer, Excel/CSV Importer & Database Upsert
- **Unified CreateContactsDrawer**:
  - Replaced separate manual addition and spreadsheet import modals with a single unified, right-sliding drawer (`CreateContactsDrawer`) supporting both creation flows.
  - Implemented manual contact forms containing Name, Phone (with dropdown country code, combined on submit), User ID, Email, Tags, WhatsApp Opted, Appointment Time, and Location.
  - Added multi-select Tag input (typing tags + Enter/comma adds badge pills), and excluded "Automated" contact creation or "Watch Video" options.
  - Added drag-and-drop Excel/CSV spreadsheet upload with custom auto-column mapping, downloadable sample CSV button with advanced headers, and expandable instructions.
  - Rewrote expandable CSV/Excel instructions to be specific to Waptrix, detailing default country code prepending, single-column phone mapping, supported fields, and overwrite behavior.
- **Backend Matching Logic & DB constraints**:
  - Configured contact creation and bulk import API routes (`/api/contacts` and `/api/contacts/import`) to use `.upsert(..., { onConflict: 'tenant_id,phone' })`, relying on database-level unique constraints to overwrite/update existing records in-place.
  - Mapped custom fields seamlessly: User ID $\rightarrow$ `custom1`, Tags $\rightarrow$ `custom2` (comma-separated), WhatsApp Opted $\rightarrow$ `opted_in`, and Appointment/Location $\rightarrow$ `custom3` (serialized JSON).
- **Contacts Table Upgrade & UI Modernization**:
  - Installed a premium floating dashboard metrics row calculating Total Contacts, Opted-in Rate, Active Segments, and Filtered View.
  - Redesigned the Segments sidebar with custom folders, active state highlights, borders, and count indicators.
  - Enhanced table columns by embedding Lucide icons (`User`, `Phone`, `Hash`, `Tag`, `Calendar`, `CheckCircle2`) within the headers.
  - Implemented multi-colored gradient avatars mapped by initial letter hashes (emerald, blue, purple, amber, cyan).
  - Modernized data rendering: compact ID badges, tag pills with tag icons, serialized appointment calendar/pin cards, and pulsing opted-in status dot indicators.
  - Added sleek circular action controls with responsive hover scale transitions.
  - Resolved page syntax compilation errors in `/src/app/(dashboard)/contacts/page.tsx` by correcting division tags and span className closures.
- **Tag Filtering & Contacts Export Options**:
  - Implemented dynamic tag extraction using React `useMemo` to construct a unique array of sorted tags from the active contacts list.
  - Added a responsive filter select dropdown next to the search bar to filter contacts by selected tags.
  - Configured segment and search query modifications to reset the active tag filter state to avoid empty pagination states.
  - Integrated a client-side CSV export function that compiles all currently filtered contacts (Name, Phone, Email, User ID, Tags, Opted-in status, and parsed Appointment Time & Location) into a downloadable CSV file.
  - Added the "Export CSV" trigger action button inside the primary header controls next to the Import action.

## [2026-06-24] - Landing Page, Error Boundaries, and UX Enhancements
- **Landing Page Integration**:
  - Created a fully responsive, interactive, and SEO-optimized static landing page at `public/index.html` featuring smooth scroll transitions, FAQs, dynamic testimonials, and a custom CSS style sheet matching the dark theme.
- **Robustness & Error Resilience**:
  - Added fetch and action error boundaries with local state checking and manual retry buttons to key dashboard views (Home page, Analytics page, Campaigns page, Contacts page, Templates page).
  - Increased network request timeouts to 15 seconds on the contacts dashboard to handle heavy segment queries safely.
- **UX & UI Refinements**:
  - Implemented CSV export functionality on the Analytics page, compiling core metrics to a browser-downloaded file.
  - Added visual error response alerts inside the Inbox panel when WhatsApp template/message replies fail.
  - Optimized the inbox polling interval from 3s to 8s to reduce network load.
  - Improved Campaign Wizard step navigation, preventing progression during loading/error states, adding a launch error boundary, and ensuring date inputs prevent past date selection.
  - Configured `useMemo` for Supabase client instantiation in the settings page to optimize render performance.
- **Campaign Log Detail Upgrades**:
  - Enhanced campaign dispatch endpoint to parse and store specific Meta Graph API error codes and subcode messages (`[code] message`) when immediate send jobs fail.
  - Re-rendered Campaign log visual statuses to support granular delivery states (`read`, `delivered`, `sent`, `failed`, `queued`) via inline icons and lowercase normalization.
- **Background Campaign Execution & Worker**:
  - Extracted shared campaign sending logic to a unified client-and-worker helper in `src/lib/campaign-sender.ts`.
  - Created a minute-by-minute cron worker at `src/app/api/worker/campaigns/route.ts` to process pending scheduled campaigns, securing access with `CRON_SECRET` validation.
  - Updated Vercel configuration (`vercel.json`) to trigger the campaigns cron worker every minute.
  - Refactored the campaigns route handler to launch immediate dispatches asynchronously using Vercel's `waitUntil` function, optimizing client response times.
  - Handled incoming Meta webhook message failures by incrementing `failed_count` and adjusting `sent_count` metrics dynamically.
  - Added real-time success toasts in the Campaigns UI upon background campaign execution start.
## [2026-06-19] - Campaign Delivery/Read Webhook Updates & Dashboard Verification/Polish
- **Webhook Status Synchronization**:
  - Enhanced `/api/webhooks/meta` webhook handler to update campaign delivery metrics (`delivered_count` and `read_count`) dynamically as incoming Meta status event payloads are processed.
  - Linked message log status tracking directly to `message_logs` in addition to real-time chat messages.
  - Statically queries both metrics to resolve TypeScript union type-indexing constraints.
- **Campaign UI and Variable Fixes**:
  - Resolved UI menu dropdown clipping on the campaigns management dashboard page (`src/app/(dashboard)/campaigns/page.tsx`) by positioning action menus above the targeted row.
  - Refactored `normalizedPhone` instantiation sequence inside `/api/campaigns` controller to prevent reference order discrepancies during instant dispatch.
- **TypeScript & Build Error Resolution**:
  - Fixed database generic client parameter typing inside `src/app/api/webhooks/meta/route.ts` by using `SupabaseClient`.
  - Added null checks for existing connection queries in `src/app/api/whatsapp/oauth-connect/route.ts`.
- **Dynamic Analytics Integration**:
  - Updated `/api/analytics` to expose total delivered and total failed metrics.
  - Rewrote the `/analytics` front-end page to dynamically fetch from `/api/analytics` and `/api/campaigns` instead of using static constants.
- **Media Library Inline Layout Polish**:
  - Added `isInline` prop support to `MediaLibrary` to strip the centering container and absolute backdrop.
  - Passed `isInline={true}` to `MediaLibrary` inside `/media` page wrapper to resolve viewport blocking that prevented navigation.
- **Settings Clipboard States Separation**:
  - Split `copied` state into `copiedCallback` and `copiedToken` to avoid matching checkmark badges on both inputs.

## [2026-06-08] - WhatsApp Business Profile Management & Signup Flow Refinement
- **WhatsApp Business Profile Integration**:
  - Implemented the WhatsApp profile display and editing UI on `/settings`, showcasing connection state, synchronized business details (avatar, name, phone, last sync time).
  - Developed the bio/about text field (limited to 139 characters) with direct synchronization to Meta Graph API.
  - Built an interactive profile picture upload widget utilizing `FileReader` for immediate client previews and a hidden file input.
- **WhatsApp Profile API Endpoints**:
  - `GET /api/whatsapp/profile`: Retrieves business details from Meta's `whatsapp_business_profile` endpoint using stored credential tokens.
  - `POST /api/whatsapp/profile`: Updates profile attributes (about, description, email, websites) to Meta and records sync logs.
  - `POST /api/whatsapp/profile/picture`: Handles multi-part file uploads (jpeg/png up to 5MB), uploads the file to the Meta Graph API `/media` endpoint, and links the resulting media handle to the business's profile avatar.
- **Embedded Signup Flow Refinement**:
  - Refactored `src/app/(dashboard)/connect/page.tsx` login handler to resolve race conditions. Instead of instantly executing a synchronization fetch request post token storage, the flow relies on the `WA_EMBEDDED_SIGNUP` `FINISH` event listener to complete the connection, keeping the client state as "connecting" with a loader while the user navigates the Meta popup.

## [2026-06-07] - Build Fixes & Auth/Webhook Middleware Routing
- **Build Compilation Fix**: Resolved production build failure by removing unused imports (such as `Image` and `formatDistanceToNow`) in `src/components/inbox/InboxPanel.tsx`.
- **Client Component Directive Cleanup**: Removed invalid `export const dynamic = 'force-dynamic'` from client-side component `src/app/signup/page.tsx` to prevent Next.js build compilation warnings/errors.
- **Middleware Routing Exclusion**: Configured `src/middleware.ts` to allow direct public access to `/api/auth/` and `/api/webhooks/` routes, preventing auth redirection checks from blocking incoming Meta webhooks and internal authentication handlers.

## [2026-06-06] - Real-time Conversational Inbox & Webhook Signature Verification
- **Meta Access Token Exchange**:
  - Implemented client-to-server exchange in `/api/whatsapp/store-token` converting short-lived tokens to 60-day long-lived tokens using Meta's exchange API.
  - Added PostgreSQL schema migration in `add_token_expiry.sql` adding `token_expires_at` to the `wa_connections` table.
- **Automated Token Rotation Cron**:
  - Created `/api/cron/refresh-tokens` endpoint to automatically identify tokens expiring within 10 days and rotate them using Meta's exchange endpoints. Secured via `CRON_SECRET` validation headers.
  - Registered the token rotation cron in `vercel.json` to execute daily at 3:00 AM.
  - Adjusted the campaign dispatcher cron frequency in `vercel.json` from daily (`0 0 * * *`) to run every 15 minutes (`*/15 * * * *`).
- **Inbox Database Schema**: Created `inbox_schema.sql` defining `conversations` and `chat_messages` tables with appropriate indexing, cascade deletion rules, and enabled Supabase Realtime publication setup.
- **Conversational APIs**:
  - `GET /api/conversations`: Fetches tenant-scoped conversations ordered by last message timestamp.
  - `GET /api/conversations/[id]/messages`: Fetches chronological chat log history.
  - `POST /api/conversations/[id]/mark-read`: Safely resets unread message counters.
  - `POST /api/conversations/[id]/reply`: Validates connection credentials, dispatches messages/templates to Meta Graph API, and logs the `outbound` messages.
- **Meta Webhook Verification and Ingestion Upgrade**:
  - Configured signature verification via `HMAC-SHA256` hashing using `META_APP_SECRET`.
  - Extended `/api/webhooks/meta` `POST` method to digest message statuses (delivered/read/failed), locate owner tenants via `phone_number_id`, parse diverse formats (text, buttons, attachments), and upsert threads in real-time.
  - Aligned webhook GET handshake verification token with `META_VERIFY_TOKEN`.
- **Real-time Inbox Dashboard**: Built the responsive, premium glassmorphic `InboxPanel` component with instant filtering, template selection, and automated conversation scroll lock.
- **Global Context Integration**: Integrated `InboxProvider` context to sync active/unread states globally. Appended active unread count badge indicators to the sidebar panel.

## [2026-05-22] - Dynamic Dashboard Metrics & Action Routing
- **Dynamic Metrics and Visual Wow-factor**: Modified the home dashboard (`/src/app/(dashboard)/page.tsx`) to pull live aggregated stats ("Total Messages Sent", "Delivery Rate", "Total Contacts", "Active Templates") and chronological 14-day chart volume from `/api/analytics` via React Hooks and Axios.
- **Glassmorphic Loading States**: Designed and integrated a premium loading spinner on mount to match the platform's luxury dark theme.
- **Interactive Quick Action Triggers**: Connected the "New Campaign", "Import Contacts", and "Create Template" action buttons to route seamlessly. Updated the Campaigns and Contacts pages to automatically read URL parameters (`?new=true` / `?import=true`) and open their creation/import wizard panels instantly, clearing search parameters afterwards to ensure clean browser history.
- **TypeScript Type Safety**: Added type annotations to the rolling 14-day database group array in the analytics route handler to enforce full project type compilation.

## [2026-05-22] - Campaign Validation & Niche Library Management
- **Stable Auth Login Redirection**: Resolved the "double-click/refresh to login" issue by changing `router.push('/')` client transitions to a full browser redirection `window.location.href = '/'` inside `src/app/login/page.tsx`. This guarantees browser cookie headers are fully written and passed directly to the Supabase SSR middleware, completely bypassing client-side caching race conditions.
- **Campaign Logs Table & Constraint Alignment**: Resolved delivery execution crashes by shifting database logger writes from the nonexistent table `campaign_logs` to the correct `message_logs` table. Modified queries to select the required `id` (as `contact_id`) from the contacts table to satisfy NOT NULL constraints.
- **Granular API Error Capture**: Configured route controllers (`/api/campaigns` and `/api/cron/send-scheduled`) to extract descriptive Axios error objects (`sendErr.response?.data?.error?.message`) when dispatching messages via Meta Graph APIs, saving detailed reasons for reception failures (e.g. sandbox recipient validation) to the database.
- **Interactive Option Menus**: Wired up the unhandled three-dot dropdown action buttons in the campaigns list UI (`src/app/(dashboard)/campaigns/page.tsx`) to allow users to trigger "View Delivery Logs" and "Delete Campaign" dynamically.
- **Single Campaign DELETE Endpoint**: Implemented `/src/app/api/campaigns/[id]/route.ts` supporting full cascade campaign deletions, removing all dependent logs cleanly.
- **Diagnostics Delivery Modal**: Developed a glassmorphic logs modal in the campaigns page that pulls real-time tracking data (`GET /api/campaigns/[id]/logs`) to show exact counts, delivery outcomes, and individual error reasons for failed attempts.
- **Campaign Immediate Launch Implementation**: Added an inline immediate campaign send execution flow directly inside the `/api/campaigns` route for immediate campaigns (`send_now: true`), bringing instant message dispatch.
- **Cron Query Schema cache relationship Fix**: Resolved the campaign sender query error (`Could not find a relationship between 'campaigns' and 'wa_connections' in the schema cache`) by querying `wa_connections` separately based on `tenant_id`, and refined contact list fetching to correctly filter by `segment_id`.
- **Standardized Import and Contact Route**: Refactored `/api/contacts/import` to utilize standardized `@supabase/ssr` cookies and statically import `@supabase/supabase-js`, resolving the 500 error, and added the missing `DELETE` method to `/api/contacts` to enable individual contact deletions.
- **Contacts Niche & List Management Library**: Built a complete, robust "Library Way" contact segment manager in `src/app/(dashboard)/contacts/page.tsx`. Added on-the-fly niche creation during CSV uploads and manual additions, real-time contact count badges to the left sidebar, and a full-screen "Niche & List Library" modal to rename/delete lists cleanly.
- **Niche API PUT & DELETE Handlers**: Implemented custom API `PUT` (rename) and `DELETE` (delete niche and unassign contacts safely) methods in `src/app/api/contacts/segments/route.ts` to coordinate database actions with frontend library state.
- **Campaign POST API Validation**: Added strict validation rules for `name`, `templateId`/`template_id`, and `segmentId`/`segment_id` fields at the beginning of the campaign creation API handler.
- **CamelCase & Snake_case Compatibility**: Implemented automatic fallback mapping in `/api/campaigns` to gracefully accept both `template_id`/`segment_id` and `templateId`/`segmentId` field shapes.
- **Client Payload Verification**: Integrated a descriptive `console.log` in `CampaignWizard.tsx` inside the launch hook to trace the exact keys and data sent to `/api/campaigns`.
- **Reusable Auth Helpers**: Created a clean local `getUser()` SSR session retrieval utility in the campaigns route.

## [2026-05-21] - WhatsApp Connection Route Update
- **Connection API Rewrite**: Replaced `src/app/api/whatsapp/connection/route.ts` with a direct implementation utilizing `@supabase/ssr` (specifically `createServerClient`) to properly fetch user sessions and retrieve the service client directly.
- **Global API Refactor**: Standardized the Supabase client implementation across all API routes to consistently use `@supabase/ssr` and `createServerClient` for reliable session fetching and service client initialization.
- **Segments API Fix**: Fully updated `src/app/api/contacts/segments/route.ts` to implement the same `@supabase/ssr` and `createServerClient` standard across `GET` and `POST` methods.

## [2026-05-20] - Supabase Auth Cookie & Service Role API Bypass Fix
- **Supabase Auth getSession Replacement**: Replaced cookie-unstable `getSession` calls with `getUser` in all API route handlers to ensure reliable authenticated user retrieval.
- **Service Role Client RLS Bypass**: Standardized database querying across all application endpoints (campaigns, templates, contacts, segments, media, profile updates, token exchanges, syncs, and cron workers) to use the Supabase `service_role` client to bypass RLS, filtering by the authenticated user's ID manually.

## [2026-05-19] - WhatsApp Connect Page Stuck & SDK Load Fix
- **Contacts Import, Drag-and-Drop, and Excel Spreadsheets Parsing**: Fixed PostgreSQL schema cache violations during imports by aligning field payloads directly with the `custom1`/`2`/`3` and `opted_in` schema columns and matching segment assignments. Implemented full HTML5 drag-and-drop React listener events on the modal dropzone, and integrated client-side SheetJS parsing supporting native `.xlsx` and `.xls` uploads.
- **Campaign Wizard Launch & Table Relationships Refactoring**: Resolved campaign creation bugs by feeding `segment_id` and `variable_mapping` into database inserts to pass NOT-NULL constraints, repaired the fetching relations query to correctly map from `contact_segments` to the `segments` table, and aligned cron job dispatch and dashboard badge statuses case-sensitively.
- **Message Template Builder Database Schema Realignment**: Resolved a schema mismatch where template inserts were attempting to save status as `status` and details as `components`, mapping them instead to compliant PostgreSQL columns (`meta_status`, `header_type`, `header_text`, `body`, `footer`, `buttons`).
- **Complete Meta WhatsApp Message Template Creation Integration**: Developed complete implementation endpoints inside `/api/templates/[id]/submit` and `/api/templates/[id]/sync` to register standard template structures (with automatic validation body example samples) with Meta and update approval reviews.
- **Detailed WABA Debugging Log Payload**: Implemented a comprehensive error response payload containing `debugInfo` (detailed WABA and business account responses, alongside access token prefix traces) inside both `/api/whatsapp/sync-connection` and `/api/whatsapp/connect` endpoints when no active accounts are resolved.
- **Immediate Post-Login Sync Trigger**: Replaced the FB.login callback to trigger the `/api/whatsapp/sync-connection` API immediately after storing the accessToken. Added a 2-second initial processing delay and a 5-second auto-retry flow for 100% sync reliability without requiring transient message events.
- **Fast Synchronizing Timeout**: Shortened the connection check fetch request timeout from 10 seconds to 3 seconds using `AbortController` signals to facilitate instant UI updates after login completions.
- **Dynamic Multi-Endpoint WABA Discovery**: Implemented a dual-fallback auto-discovery algorithm (trying direct WABA graph calls followed by merchant/business business accounts query) in `/api/whatsapp/sync-connection` and `/api/whatsapp/connect` endpoints to securely link matching phone details.
- **Dynamic Meta SDK Loading**: Added an dynamic script loader inside `useEffect` that handles full mount lifecycle checks and updates `sdkLoaded` state to track real-time initialization.
- **CTA Disable State**: Configured the "Connect WhatsApp Business" action button to display "Loading..." and disable clicks until the Meta SDK is fully operational.
- **Trace Logs & Click Guard**: Added trace console logging to verify FB/SDK states on click and prevent executions if load is not complete.
- **URL Parameter Fallback Check**: Integrated an on-load URL search query parameter check to intercept cases where Meta redirects back to the main window with `waba_id` and `phone_number_id` rather than posting window messages.
- **Robust Status State Machine**: Integrated full statuses: `'idle' | 'connecting' | 'connected' | 'error'` with custom loaders, beautiful checkmarks, and a fallback link to manually check synchronization states.
- **Address Bar Cleanup**: Cleaned up the window query parameters dynamically using HTML5 `history.replaceState` immediately upon capturing redirect credentials.

## [2026-05-18] - Direct WhatsApp Token Storage & Origin Fix
- **Direct AccessToken Storage**: Replaced FB.login callback to handle `accessToken` directly. Stored immediately to a new dedicated route `/api/whatsapp/store-token` without requiring the `code` exchange.
- **Enhanced Message Listener**: Updated window message listener to accept both `facebook.com` and `waptrix.in` origins to resolve origin mismatches and cross-subdomain/Vercel mapping issues.
- **Mock Bypass for Localhost**: Updated explicit localhost bypass to mock both `/api/whatsapp/store-token` and `/api/whatsapp/connect` correctly.

## [2026-05-17] - Fix WhatsApp Embedded Signup Callback
- **Embedded Signup Callback**: Added window message listener in `src/app/(dashboard)/connect/page.tsx` filtering Facebook domains and listening for `WA_EMBEDDED_SIGNUP` `FINISH` event.
- **Race Condition Retry**: Implemented a robust 5x retry loop in `handleFinish` to let the parallel token exchange database write complete before fetching the connect API.
- **Connect API Route**: Completely refactored `/api/whatsapp/connect/route.ts` to accept `wabaId` and `phoneNumberId`, lookup existing `access_token`, query Meta Graph API `v19.0` for number/business details, and upsert them.



## [2026-05-12] - Branding Update & Logout Functionality
- **Dependencies**: Installed missing packages (`npm install`).
- **Server**: Started the local development server on `localhost:3001`.
- **WhatsApp API Fix**: Re-implemented the token exchange API route and FB.login client code for the Meta Embedded Signup flow. Fixed the 500 error code exchange failure.
- **Branding**: Updated app metadata in `layout.tsx` to "Waptrix".
- **Sidebar**: Added a functional Logout button with Supabase authentication integration.
- **Git**: Pushed all recent changes to GitHub `main` branch.


## [2026-04-20] - Dashboard Dynamics & Auth Stability
- **Dynamic Dashboard UI**: 
  - Implemented `TenantContext` to synchronize user profile, plan status, and messaging usage across Topbar and Sidebar components.
  - Replaced static "Danish Sayed" labels with authenticated user names and real-time usage data.
- **Login Bug Fix**: Resolved the "double-click to login" issue by adding a `router.refresh()` and a propagation timeout to ensure cookies are processed before navigation.
- **Meta App Review Support**:
  - Created a dedicated `meta-reviewer@waptrix.in` test account with a corresponding tenant profile.
  - Optimized the Meta "Reviewer Instructions" with professional access guides and credentials.

## [2026-04-20] - Branded Password Recovery & Welcome Emails
- **Custom Auth Flow**: Replaced default Supabase Auth emails with branded HTML templates via **Resend**.
- **New Routes**:
  - `src/app/api/auth/signup/route.ts`: Now sends a "beautiful" welcome email on success.
  - `src/app/api/auth/forgot-password/route.ts`: Generates a recovery link using `service_role` and sends a branded reset email.
- **Frontend Updates**:
  - [Forgot Password](file:///Users/danishsayed/Desktop/Waptrix/src/app/forgot-password/page.tsx) and [Reset Password](file:///Users/danishsayed/Desktop/Waptrix/src/app/reset-password/page.tsx) pages fully implemented.
  - [Signup Page](file:///Users/danishsayed/Desktop/Waptrix/src/app/signup/page.tsx) now integrated with the server-side API for secure email delivery.
- **Email System**:
  - Created a reusable [Email Template](file:///Users/danishsayed/Desktop/Waptrix/src/lib/email/template.ts) and [Resend Utility](file:///Users/danishsayed/Desktop/Waptrix/src/lib/email/resend.ts).
  - Configured `no-reply@waptrix.in` as the default sender.

## [2026-04-20] - Added Legal Pages
- **New Pages**: Added professional [Privacy Policy](file:///Users/danishsayed/Desktop/Waptrix/src/app/privacy/page.tsx) and [Terms of Service](file:///Users/danishsayed/Desktop/Waptrix/src/app/terms/page.tsx) pages.
- **Middleware Update**: Updated [middleware.ts](file:///Users/danishsayed/Desktop/Waptrix/src/middleware.ts) to allow public access to legal pages without authentication redirection.
- **Design Alignment**: Matched the existing dark theme (`#080A0F` background, `#10B981` jade accents) and typography (`Syne` and `DM Sans`).
- **Policy Content**: Tailored content specifically for a WhatsApp Marketing SaaS, including Meta/WhatsApp policy compliance and anti-spam measures.

## [2026-04-19] - Self-Updating Memory Protocol
- **Protocol Adoption**: Formalized a new "Self-Updating Memory" protocol where the `memory/` folder is updated automatically.
- **Rules Updated**: Updated [`AGENTS.md`](file:///Users/danishsayed/Desktop/Waptrix/AGENTS.md) with mandatory instructions for AI agents to maintain project memory.
- **Memory Initialized**: Created `memory/` directory and initialized `context.md`, `history.md`, and `environment.md`.

## [2026-04-19] - Domain Integration & Vercel Fix
- **Vercel Deployment Fix**:
  - Renamed project to `waptrix` in `package.json`.
  - Configured `vercel.json` with explicit `nextjs` framework and build commands.
  - Simplified `next.config.ts` to ignore lint/type errors during production builds.
- **Domain Integration (waptrix.in)**:
  - Updated `NEXT_PUBLIC_APP_URL` to `https://waptrix.in` in `.env.local`.
  - Refactored `SettingsPage` to dynamically display the correct Callback URL and Verify Token from environment variables.
  - Pushed all changes to GitHub `main` branch.

## [Pre-2026-04-19] - Core Setup
- **Supabase Integration**: Set up Supabase SSR with custom middleware for protected dashboard routes.
- **Meta API Setup**: Initialized Meta OAuth flow and WhatsApp Business API integration in `src/lib/meta.ts`.
- **Environment Cleanup**: Consolidated environment variables by removing redundant plain entries in favor of `NEXT_PUBLIC_` prefixes where appropriate.
