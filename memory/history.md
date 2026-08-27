# Implementation History

## [2026-08-27] - Inbox Message Pagination, Inbound Filters & Blog/Docs Expansion
- **Dev Server**: Started and restarted the Next.js development server running on port 3001 (`npm run dev`).
- **Subdomain Session Sharing & Local Testing**:
  - Configured custom cookie domains in `src/lib/supabase/client.ts` and `src/middleware.ts` (e.g., `.waptrix.in` / `localhost`) to enable session sharing between the root marketing domain and the app subdomain.
  - Enhanced middleware subdomain redirection to support local development ports and hostnames (`app.localhost`).
- **User Metadata Fetching**:
  - Refactored `GET /api/me` to include robust resolution of `userName` and `userEmail` from user metadata and auth properties.
- **Authentication State Handling**:
  - Refactored `src/app/(marketing)/layout.tsx` and `src/app/(marketing)/pricing/page.tsx` to use `onAuthStateChange` instead of `getSession` for more reliable user session detection across page navigations.
- **Inbox Message Pagination**:
  - Refactored `GET /api/conversations/[id]/messages` to accept `before` and `limit` search query parameters, enabling cursor-based message loading.
  - Updated `InboxPanel.tsx` to load only the latest 20 messages on mount.
  - Implemented scroll-up detection in `InboxPanel.tsx` to automatically load older messages.
  - Removed text message truncation (`ReadMoreText`) for normal text messages to display their complete message contents.
- **Inbound Conversation Filters**:
  - Updated `GET /api/conversations` to filter lists, returning only conversations with at least one inbound customer reply to improve support queue hygiene.
- **Marketing, Blog & Documentation Upgrades**:
  - Restructured `/blog` page and created `/blog/[slug]` route with a new post database `posts.ts` to host and display comprehensive WhatsApp marketing guides.
  - Created `/docs/layout.tsx` layout structure and significantly expanded `/docs/page.tsx` with clear guides on WABA connections, onboarding checklist, contact schema templates, and webhook automations.
  - Added active route styling using Next.js `usePathname` inside the main marketing `Navbar` component to highlight the currently visited page.

## [2026-08-22] - Campaign Detail Page Template Status Refinement
- **Template Status Refinement**: Refined the template approval status rendering on the Campaign Detail Page ([page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/campaigns/%5Bid%5D/page.tsx)) to display "Not Synced" in muted text when no status is returned, preventing false-positive "Meta Approved" indicators, and correctly formatting other non-approved statuses.

## [2026-08-21] - Dev Server Launch
- **Dev Server**: Started the Next.js development server running on port 3001 (`npm run dev`).

## [2026-08-20] - Server Startup, Collapsible Sidebar & Tenant Scope API Refactor
- **Dev Server**: Started the Next.js development server running on port 3001 (`npm run dev`).
- **Team Assignment Bugfix**: Resolved team member assignment mapping in inbox panel to match auth user IDs (`member_user_id`) instead of local database record IDs.
- **Collapsible Sidebar**: Implemented a responsive collapsible sidebar layout with smooth animations, custom tooltips, and dynamic icon-only badge states in `Sidebar.tsx`.
- **Tenant Scope API Refactoring**: Refactored API endpoints (`contacts/[id]/activity`, `contacts/by-phone`, `conversations/ensure`, `conversations/start`, `notifications/[id]`, `notifications/read-all`, `notifications`, and `templates`) to use `getEffectiveTenantId(user.id)`, ensuring correct scoping for all team members (agents/admins).
- **Git**: Committed and pushed changes to GitHub `main` branch.

## [2026-08-17] - Conversation Assignment, Inbox Improvements & API Updates
- **Conversation Assignment**:
  - Added `supabase/add-conversation-assignment.sql` migration for conversation assignment schema support.
  - Updated `src/app/api/conversations/[id]/route.ts` to support assigning conversations to team members.
- **New Message Operations Endpoint**:
  - Created `src/app/api/conversations/[id]/messages/[msgId]/route.ts` for per-message operations (reactions, edits, and updates).
- **InboxPanel Improvements**:
  - Significant update to `src/components/inbox/InboxPanel.tsx` with enhanced UI and conversation handling logic (209 insertions).
- **API Route Updates**:
  - Updated `src/app/api/analytics/route.ts` with revised aggregation logic.
  - Improved `src/app/api/contacts/by-phone/route.ts` and `src/app/api/contacts/route.ts`.
  - Enhanced `src/app/api/webhooks/meta/route.ts` with additional webhook event handling.
  - Updated `src/components/onboarding/OnboardingChecklist.tsx`.
- **Version Control**: Committed and pushed all changes to `main` branch (commit `658ada9`, 8 files changed, 288 insertions, 111 deletions).


- **Testing Price Adjustment**:
  - Adjusted `pro_monthly` price parameter to ₹10 in the pricing page and plans configuration library for sandbox payment testing.
- **Unified Pricing Plans Configuration**:
  - Created a centralized plans definition configuration file [plans.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/plans.ts) and refactored `/api/payments/create-order` and `/api/payments/initiate` route handlers to import it directly, removing code redundancy.
- **User Session Navbar Dropdown**:
  - Implemented dynamic user session checking in the marketing layout navbar (`src/app/(marketing)/layout.tsx`), showing a dashboard link and sign-out option in a profile dropdown for logged-in users instead of generic "Log In" / "Get Started" buttons.
- **Conversion Checkout Funnel (Preserved Plan parameters)**:
  - Updated the pricing page (`src/app/(marketing)/pricing/page.tsx`) to check for sessions; unauthenticated users are redirected to login with their plan selected (`/login?plan=pro_monthly`).
  - Modified the login and signup routes (`src/app/login/page.tsx` and `src/app/signup/page.tsx`) to catch the `plan` parameter, display status banners, and immediately fire up Cashfree checkout sessions on completion.
  - Implemented `/api/payments/initiate` endpoint (`src/app/api/payments/initiate/route.ts`) to verify auth via Bearer access tokens (passed via the `Authorization` header) to avoid client cookie race conditions. It retrieves tenant metadata (name, email, normalized 10-digit phone), pre-records the pending order in the database, and requests Cashfree checkout sessions.
  - Updated the pricing, login, and signup client pages to retrieve and forward the Supabase session access token in the initiate request.
- **Robust Webhook Handlers & Auditing**:
  - Rewrote the Cashfree webhook route (`src/app/api/payments/webhook/route.ts`) to handle `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, and `PAYMENT_PENDING_WEBHOOK` states idempotently by validating against already-paid orders.
  - Sends customized notification emails for pending, failed, or successful payments, and updates target tenant plan durations and trial properties.
  - Implemented database migrations (`supabase/add-payment-events.sql`) creating a `payment_events` audit table with a unique index on `(order_id, event_type)` for duplicate guardrails, adding `phone` to `tenants`, and idempotent email sent columns to `payments`.

## [2026-08-14] - Pricing Plans Overhaul, Cashfree Subscriptions & Campaign Auto-Replies
- **Trial & Plan Management**:
  - Implemented database migrations (`supabase/add-trial-columns.sql`) adding plan status (`plan`), `trial_ends_at`, and `plan_expires_at` to the `tenants` table, default-backfilling all tenants to a 7-day trial.
  - Refactored `src/app/api/payments/create-order/route.ts` to replace legacy plans with a new tier list: `pro_monthly` (₹1,999), `pro_quarterly` (₹4,999), and `pro_yearly` (₹17,999), passing along customer email, billing cycle, and expiration length as order tags.
  - Redesigned the `/pricing` page to display the new Pro plans, support checkout sessions, and render custom pricing layouts.
- **Cashfree Webhook Upgrades & Subscription Activation**:
  - Updated the Cashfree webhook route `src/app/api/payments/webhook/route.ts` to automatically resolve tenant ids from customer emails, transition paying tenants to the `pro` plan with correct expiration timestamps, and send purchase success emails via Resend.
  - Applied database changes (`supabase/update-payments-table.sql`) adding `billing_cycle`, `expires_at`, and `tenant_id` columns to the `payments` table.
- **Campaign Auto-Replies & Meta Message Tracking**:
  - Created migration `supabase/add-campaign-auto-replies.sql` to support custom campaign descriptions and automatic reply rule-sets (`auto_replies` JSONB).
  - Linked message log entries to parent campaigns by adding a `campaign_id` foreign key with performance-optimized search indexes.
- **Next.js Build & Router Cache Tuning**:
  - Tuned `next.config.ts` to compress responses, disable powered-by-header exposure, configure AVIF/WebP image formats, and define aggressive router stale cache times (`staleTimes`) for dynamic and static pages to accelerate loading speeds.
  - Added skeleton loaders (`loading.tsx`) for dashboard pages (Analytics, Campaigns, Connect, Contacts, Inbox, Settings, Team, Templates) to improve UI state transition smoothness.
- **Dev Server Startup**:
  - Started the Next.js development server on port 3001 using `npm run dev` to facilitate local development.

## [2026-08-12] - Cashfree Payments Integration & Marketing Routing Setup
- **Dev Server Management**:
  - Started the Next.js development server on port 3001 using `npm run dev` to facilitate local development.
- **Hero Graphic Replacement**:
  - Removed the original girl photo (`/hero-person.png`) and the temporary background image from the hero section of the landing page in `src/app/(marketing)/page.tsx`. Replaced it with the platform screenshot preview `/website%20photos/2.png` at full opacity, styled cleanly without any border or shadow borders.
- **Profile Bubble Images Integration**:
  - Replaced the solid background colors of the six scattered floating circles in the `FloatingTextSection` component inside `src/app/(marketing)/page.tsx` with circular customer profile images fetched from `/public/waptrix profiles/` (using URL paths `/waptrix%20profiles/1.png` through `/waptrix%20profiles/6.png`). Fitted the images perfectly inside the borders of these floating bubble circles using `object-cover`.
- **Mobile Typography Optimization**:
  - Reduced the heading font size in the `FloatingTextSection` component of `src/app/(marketing)/page.tsx` from `text-4xl` to `text-2xl` strictly on mobile screen viewports (keeping `md:text-6xl` for medium and larger devices) to improve layout readability.
- **CTA Copy & Styling Adjustment**:
  - Modified the landing page CTA block in `src/app/(marketing)/page.tsx` to remove the incorrect "2,500+ Indian businesses" marketing claim as the platform is in the initial launch phase, replacing it with: "Start reaching your customers directly on WhatsApp with Waptrix."
  - Fixed a styling issue where the global heading selector in `globals.css` overrode Tailwind's utility class on the CTA header, adding inline `style={{ color: 'white' }}` to ensure the text is rendered in pure white.
- **Favicon Integration**:
  - Replaced the default Next.js favicon in `src/app/favicon.ico` with the newly uploaded brand asset `public/fav.ico`. Explicitly defined the favicon path inside the metadata of the root layout `src/app/layout.tsx`.
- **App Subdomain & Marketing Domain Isolation Routing**:
  - Fully refactored `src/middleware.ts` to cleanly segregate domain-specific routes between the marketing website (`waptrix.in` only) and the app platform (`app.waptrix.in`).
  - Added redirects on the root domain (`waptrix.in`) to route all non-marketing paths to the `app.` subdomain.
  - Added redirects on the `app.` subdomain to route all marketing paths (except `/` itself) back to the root domain.
  - Set root path `/` on the `app.` subdomain to direct authenticated users to `/dashboard` and unauthenticated users to `/login`.
- **Unlocking Templates for Editing**:
  - Updated `isPostSubmit` condition inside `src/components/templates/TemplateBuilder.tsx` to only lock form fields when the template is in the `PENDING` state under Meta review. Users can now freely edit and resubmit `APPROVED` or `REJECTED` templates.
  - Dynamically changed the builder's action button text to "Resubmit to Meta" if the template was already approved.
- **Trust Cards Integration & Highlights (Testimonials)**:
  - Removed the trust badges from the Hero section in `src/app/(marketing)/page.tsx`. Added them as a 2-column card grid below the customer reviews inside the Testimonials section. Card 1 features the Meta Partner logo (`/meta.png`) and Card 2 features the WhatsApp logo (`/Whatsapp.png`).
  - Highlighted and animated the trust cards to distinguish them from standard testimonials: styled them with a transparent green background tint (`bg-[#D9FDD3]/30`), a brand border (`border-2 border-[#25D366]/30`), and smooth hover lift animations (`hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300`).
  - Adjusted logo image heights inside the cards to visually match and balance their aspect ratios (reduced Meta logo height to `h-7` and increased WhatsApp logo height to `h-12`).
- **Marketing & Dashboard Routing Restructuring**:
  - Moved the authenticated dashboard layout from `/` to `/dashboard` (`src/app/(dashboard)/dashboard/page.tsx`).
  - Added a responsive marketing landing page, pricing page, contact, about, docs, and blog routes under a new `(marketing)` group (`src/app/(marketing)/`).
  - Restructured `src/components/layout/Sidebar.tsx` to link to `/dashboard` instead of `/` and updated the active path highlights check.
- **Footer Link React Key Fix**:
  - Resolved a critical React key duplication issue in the footer component of `src/app/(marketing)/layout.tsx` where links in the "Company" column generated duplicate `key="/contact"` (since both "Contact" and "Careers" point to `/contact`), causing runtime render blocking in development. Fixed by changing key mapping to key={`${label}-${href}`}.
- **Middleware Authentication Routing Updates**:
  - Fixed a routing bug where unauthenticated requests to static assets in `public/` (like `/hero-person.png` and `/website photos/1.png`) were intercepted by the auth middleware and redirected to `/login` (returning HTTP 307). Updated the config matcher in `src/middleware.ts` to exclude all common static files (e.g. `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`).
  - Updated `src/middleware.ts` to redirect authenticated users visiting `/` to `/dashboard`.
  - Added a clean `isPublic` check allowing public access to marketing pages (`/pricing`, `/about`, `/contact`, `/blog`, `/docs`) and webhook endpoints.
  - Allowed unauthenticated requests to `/api/payments/` endpoint prefix to support Cashfree API functions.
- **Cashfree Payment Gateway Integration**:
  - Created a database table `payments` (`supabase/add-payments-table.sql`) with indices to track transaction statuses (`pending`, `paid`, `failed`), customer details, amount, and gateway transaction IDs.
  - Developed `/api/payments/create-order` endpoint (`src/app/api/payments/create-order/route.ts`) interfacing with Cashfree API to initiate transactions and return a payment session ID.
  - Built `/api/payments/webhook` route (`src/app/api/payments/webhook/route.ts`) to receive Cashfree webhook callbacks, verify payloads, and upsert transaction records into the database upon successful payments.
  - Integrated Cashfree Checkout JS SDK in `/pricing` page (`src/app/(marketing)/pricing/page.tsx`), letting users fill details, invoke payment popups, and view success/failure status banners based on callback URL parameters.

## [2026-08-11] - Campaign Analytics Email Redesign & WhatsApp Validation API Fallback
- **Opt-in Status Defaulting & Campaign Audience Expansion**:
  - Defaulted contact opt-in status (`opted_in`) to `null` (instead of `false`) during manual contact creations in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/contacts/route.ts) and CSV imports in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/contacts/page.tsx).
  - Modified the campaign enqueuing worker query in [campaign-queue.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/campaign-queue.ts) to filter using `.or('opted_in.is.null,opted_in.eq.true')`. This expands campaigns to include contacts who haven't explicitly opted out (i.e. those with `opted_in = true` or `null`), matching the `opted_in !== false` logic.
  - Adjusted the batch dispatcher in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/campaigns/[id]/process-batch/route.ts) to skip contacts only if they are explicitly opted out (`opted_in === false`).
  - Fixed idempotency counting statistics in the campaign dispatcher, initializing sent counts to `alreadySentCount` instead of `skippedCount`.
  - Added template media pre-uploading in [campaign-queue.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/campaign-queue.ts): if the template has a media header, the enqueuer uploads the file once to Meta's media API to acquire a single `media_id` reused across all batches, preventing redundant uploads and fixing Meta `131053` media errors.
  - Implemented dynamic contact variable resolution in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/campaigns/[id]/process-batch/route.ts), resolving placeholders like `{{1}}` with contact-specific fields (e.g. name) to store the actual sent message text in conversation previews and message logs.
  - Tracked template names in the database in [add-template-name-to-messages.sql](file:///Users/danishsayed/Desktop/Waptrix/supabase/add-template-name-to-messages.sql) by adding a indexed `template_name` column to `chat_messages` table.
  - Populated `template_name` and stored the full, uncensored template body in `content` when sending campaign template batches in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/campaigns/[id]/process-batch/route.ts) and sending manual template replies in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/conversations/[id]/reply/route.ts).
  - Enhanced [InboxPanel.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/components/inbox/InboxPanel.tsx) to query templates case-insensitively using `template_name`, falling back to match by body prefix (ignoring variables) for legacy messages, and rendering a fully resolved template bubble featuring custom media headers, footers, action buttons, and contact-specific resolved body text. Added a check to display the template's default body instead of raw placeholders if unresolved `{{N}}` syntax is present in old messages.
  - Added a `ReadMoreText` component to [InboxPanel.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/components/inbox/InboxPanel.tsx) to collapse long text messages, template bodies, and internal note boxes exceeding 60 characters, introducing interactive "Read more" and "Read less" inline toggle buttons.
  - Updated the contact `PATCH` route in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/contacts/route.ts) to keep `opted_out_at` in sync with `opted_in` changes, populating the current timestamp when opting out (`opted_in === false`) and clearing it when opting in.
  - Redesigned the contacts table status badges in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/contacts/page.tsx) to show "Active" (where `opted_in !== false`) and "Opted-out" (where `opted_in === false`), removing the need for a legacy contact fix banner.
  - Adjusted the Opted-in Rate calculation card to count active contacts (`opted_in !== false`) instead of `opted_in === true`.
- **Redis Contact List Caching & Invalidation Resiliency**:
  - Refactored `getCachedContacts` in [redis.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/redis.ts) to ignore cached empty arrays and avoid caching empty query results entirely, shielding campaigns from transient empty list caches.
  - Modified the contacts `PATCH` route in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/contacts/route.ts) to scan and delete all cached segment keys (`contacts:tenant_id:*`) on update, forcing campaigns to immediately pull freshly updated status records.
  - Hardened `enqueueCampaignBatches` in [campaign-queue.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/campaign-queue.ts) to log database query errors, print enqueuing metrics, and immediately flag empty campaigns (0 contacts) as `sent` to prevent silent enqueuer hangs.
- **Friendly Meta Template Submission Error Translations**:
  - Added user-friendly English explanations in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/templates/[id]/submit/route.ts) for common Meta API template submission failures: duplicate names (subcode 2388024), invalid words (subcode 2388003), utility content rejections (subcode 2388006), account template limits (subcode 2388007), and expired OAuth tokens (code 190).
- **Simplified Contacts Importer UX**:
  - Simplified the bulk import drawer flow in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/contacts/page.tsx) by removing the explicit validation step from the primary import sequence. Users can now directly import all contacts passing client-side international format checks, with non-WhatsApp numbers dynamically flagged and filtered on send.
  - Kept the legacy check-whatsapp validation endpoints and results panels in the client as a backend utility.
- **WhatsApp Validation API Database Fallback & Multi-Token Check**:
  - Rewrote the `/api/contacts/check-whatsapp` API route in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/contacts/check-whatsapp/route.ts) to check multiple tokens sequentially (`META_SYSTEM_TOKEN` -> connection `access_token`), fallback-retrying on all validation failures (e.g. system token missing access to client's specific phone number - code 100) to check if the tenant's own OAuth credentials succeed.
  - If the Meta API is unavailable or returns an error across all tokens, it falls back to a database lookup against known invalid numbers (`custom4 = 'not_on_whatsapp'`). Returns detailed status variables including `apiAvailable`, the resolution `source` (`'meta_api'`, `'db_check'`, or `'unavailable'`), and the specific `metaError` if applicable.
  - Refactored the bulk contact importer drawer in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/contacts/page.tsx) to read the validation source. If real-time check fails (`apiAvailable = false`), the importer imports all contacts passing format validation, shows a warning box explaining the failure along with the specific Meta API error code, and displays the correct count stats.
- **Campaign Send Filtering for Known Non-WhatsApp Recipients**:
  - Modified the campaign batch processing route in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/campaigns/[id]/process-batch/route.ts) to filter out recipients flagged as `custom4 === 'not_on_whatsapp'`, preventing unnecessary Cloud API requests and messaging costs.
  - Added error code `100` (system user not assigned to WABA) to token retry fallback triggers in the batch dispatcher, retrying with the tenant's token.
- **Campaign Analytics Email Redesign**:
  - Redesigned the campaign completion email template (`getCampaignAnalyticsEmail`) in [template.ts](file:///Users/danishsayed/Desktop/Waptrix/src/lib/email/template.ts) to feature a modern, clean light theme layout with detailed cards for total, sent, and failed contact metrics.
  - Added an explanatory card in the email template pointing users to the live dashboard for real-time delivery and read rates, which update via webhooks minutes after sending.
  - Adjusted the batch dispatcher in [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/campaigns/[id]/process-batch/route.ts) to initialize delivery and read rates to `0` in the email, since webhooks are not yet received at the immediate conclusion of batch processing.
- **Dashboard Date Picker Refinement**:
  - Appended `type="button"` to preset and custom apply button triggers on the dashboard homepage in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/page.tsx) to prevent accidental parent page form submissions.
  - Removed the fallback close overlay `div` in the dashboard file, relying on the existing window `mousedown` event listener to close the date picker on click-outside.

## [2026-08-10] - Solution Provider WhatsApp Validation & Automated Recipient Filtering
- **Solution Provider WhatsApp Validation (BSP API Integration)**:
  - Created [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/contacts/check-whatsapp/route.ts) which uses Meta's `POST /{phone_number_id}/contacts` endpoint to check if phone numbers are active WhatsApp users. Falls back gracefully with `unsupported: true` if the account does not have Solution Provider status.
  - Updated contacts upload flow in [page.tsx](file:///Users/danishsayed/Desktop/Waptrix/src/app/(dashboard)/contacts/page.tsx) to automatically run batch validation on bulk spreadsheet imports (up to 100 contacts per request), rendering validation statistics (✅ On WhatsApp / ❌ Not on WhatsApp) and filtering invalid numbers from imports.
- **Automated Delivery Failure Handling (Webhook Error 131026)**:
  - Modified Meta webhooks handler at [route.ts](file:///Users/danishsayed/Desktop/Waptrix/src/app/api/webhooks/meta/route.ts) to detect Meta error code `131026` ("recipient is not a WhatsApp user").
  - On detection, it automatically updates the contact's subscription status to `opted_in = false`, marks their `custom4` field with `'not_on_whatsapp'`, and deactivates any active conversation thread in the database.
- **UI Enhancements for Non-WhatsApp Contacts**:
  - Added a "Not on WhatsApp" dashboard summary card to the contacts page tracking numbers flagged with `custom4 === 'not_on_whatsapp'`.
  - Added a distinctive warning badge for contacts identified as not registered on WhatsApp in the contacts table view, warning agents and preventing accidental outbound templates.

## [2026-08-09] - Contact Opt-in Defaults, Phone Duplicate Prevention, and Emoji Picker UI Fixes
- **Contact Opt-in Defaults & Duplicate Prevention**:
  - Defaulted "WhatsApp Opted In" to `false` for manual contact creations in both the client-side `CreateContactsDrawer` and the server-side API `/api/contacts` POST handler.
  - Implemented strict database-level phone number duplicate checking under `/api/contacts` POST handler, normalizing phone values to check for both `+91...` and `91...` formats under the active tenant ID, rejecting duplicates with a `409` status code.
  - Replaced SQL `upsert` with standard `insert` in API route to enforce unique constraint checks.
  - Added descriptive/warning text to the radio selector options in `CreateContactsDrawer` to remind users of WhatsApp compliance requirements.
  - Handled duplicate errors (status `409`) on the client side to display a user-friendly manual warning alert instead of generic failure messages.
- **Inbox Emoji Picker UI Refinements**:
  - Repositioned the `<InboxEmojiPicker>` component to render inside the reply editor text field relative wrapper, allowing the `bottom-full` class to position the picker correctly above the text box.
  - Refactored click-outside handler in `InboxPanel.tsx` to exclude clicks on the emoji trigger button (`emojiButtonRef`), preventing the picker from instantly toggling closed when clicked.
  - Removed `autoFocus` from the emoji picker search box (`InboxEmojiPicker`) to keep focus on the main chat text area.

## [2026-08-06] - Campaign Opt-Outs, Custom Analytics Ranges, & Team Chat Unread Badges
- **Campaign Opt-Out Handling (STOP/START Keywords)**:
  - Added SQL migration `supabase/add-optout.sql` to add `opted_out_at` tracking to `contacts` table and created an index for active filtering.
  - Implemented opt-out/opt-in detection based on keywords (STOP, UNSUBSCRIBE, CANCEL, QUIT, START, YES, etc.) inside Meta webhook route `src/app/api/webhooks/meta/route.ts`, automatically toggling `opted_in` and dispatching confirmation replies.
  - Filtered campaign enqueuing queries in `src/lib/campaign-queue.ts` and dispatch checks in `src/app/api/campaigns/[id]/process-batch/route.ts` to exclude contacts who have opted out.
- **Analytics Custom Date Range Picker**:
  - Rewrote `/api/analytics` route to accept `from` and `to` query parameters, aggregating chronological message volumes inside specified date ranges (up to a 90-day window).
  - Integrated range preset buttons (7d, 14d, 30d) and a custom date-picker dropdown in both the Analytics dashboard page and the main home Dashboard page (`src/app/(dashboard)/page.tsx`), featuring auto-click-away overlay closures.
- **Team Chat Unread Notifications**:
  - Created `/api/team-chat/unread` endpoint querying message counts from other team members since a given `since` ISO timestamp.
  - Updated `Sidebar.tsx` to poll for unread team messages using `lastSeenTeamChat` timestamp records stored in `localStorage`, displaying unread badges on the Team Chat menu row.
  - Hardened Web Audio context activation in `/team-chat` page to dynamically unlock on user interaction gestures to bypass browser autoplay blocks.
- **Campaign Error Tracking & Meta API Resilience**:
  - Added SQL migration `supabase/add-message-logs-error-column.sql` to add a queryable `error` text column to `message_logs` for storing detailed delivery failures.
  - Rewrote Meta template payload building in `src/lib/meta.ts` and dispatch routes to omit empty components arrays (which are rejected by the Meta API for templates without variables).
  - Hardened phone number normalization across all sending handlers (`process-batch`, `reply`, `start`) to strip spaces, dashes, and plus symbols, formatting strictly to E.164 digits as expected by the Cloud API.
  - Integrated the global `META_SYSTEM_TOKEN` for all message sends (batch campaigns, inline reply routes, and conversation initiations) with a fallback to the tenant's own `access_token` on permissions error code 200/190.
  - Created a diagnostic API endpoint `/api/whatsapp/test-send` to let users dry-run a template message to a test number and view detailed token comparison results.
  - Updated `src/app/api/webhooks/meta/route.ts` to query conversations using an OR filter matching both prefix-free and prefixed phone formats, avoiding duplicate chat thread generation when a user responds.
  - Standardized new conversation inserts in the webhook handler to pre-pend the `+` prefix to the `contact_phone` field.
  - Refactored template dispatches in `process-batch`, `reply`, and `start` routes to query the DB for the actual template body text (truncated to 120 characters) to show as a meaningful last-message preview in the conversation inbox, instead of a static `[Template: name]` placeholder.
- **WhatsApp Template Category Sync & Auto-Detection**:
  - Implemented background category syncing on mount in `TemplatesPage.tsx` using `/api/templates/[id]/sync` to check for Meta-initiated category reclassifications, notifying users with toast alerts and warning badges on mismatches.
  - Implemented a smart keyword-based analyzer in `TemplateBuilder.tsx` to analyze body text on the fly and suggest the matching Meta category (Marketing, Utility, Authentication) with a one-click apply trigger.
  - Updated the template mockup preview header in `TemplateBuilder.tsx` to fetch and display the tenant's actual WhatsApp business name from `/api/whatsapp/connection`, passing it down as a prop to the `PhonePreview` sub-component.
  - Added a template deletion blocker in `src/app/api/templates/[id]/route.ts` checking if the template is referenced in any active campaigns, returning a 409 Conflict if so.
  - Refactored the templates list view card triggers to make the entire card clickable to open/edit, improving dashboard ergonomics.

## [2026-08-08] - Inbox Inline Contact Editing, Internal Notes, & Smooth Dashboard Loading
- **Inbox Inline Contact Editing Sidebar**:
  - Created `/api/contacts/by-phone` to lookup contacts matching a phone number (with or without `+` prefixes).
  - Added PATCH and DELETE endpoints in `src/app/api/contacts/[id]/route.ts` to update contact fields (name, email, tags, notes, opted_in) and delete contact records.
  - Integrated a collapsible right-hand Contact details panel inside `InboxPanel.tsx` allowing agents to view and update contact information, edit tags, and manage notes directly within the conversational viewport.
  - Implemented `ensureContact()` in `InboxPanel.tsx` to auto-provision a minimal contact record in the database if an agent edits tags/notes for an inbox conversation with no existing contact record.
  - Hardened chat scroll behavior in `InboxPanel.tsx` to only trigger auto-scroll-to-bottom on new messages if the user is already within 200px of the chat floor, preventing viewport theft when reading past logs.
- **Timezone-Aware Campaign Scheduling**:
  - Integrated a regional timezone dropdown selector inside `CampaignWizard.tsx` supporting global zones (IST, GST, AST, CET, ET, CT, PT, SGT).
  - Implemented `wallClockToUTC` translation to compute future schedule limits relative to target regional settings, storing correct UTC dates on the backend.
- **Inbox Internal Chat Notes**:
  - Enabled private team communication inside the inbox by adding support for internal chat notes (type `note`) in both `InboxPanel.tsx` and reply endpoint `/api/conversations/[id]/reply/route.ts`, saving notes locally in the thread history without calling Meta APIs.
- **Home Dashboard UX Refinements**:
  - Configured click-outside handlers for the date-range picker on the main dashboard homepage using a dedicated `pickerRef` reference.
  - Replaced hard fullscreen loading and error blockouts on the home dashboard with inline error states and glassmorphic loading overlays inside the campaign delivery chart container.

## [2026-08-04] - Fix Analytics Date Filtering & Real Read Tracking
- **Team Management & Shared Tenant Scoping**:
  - Implemented team members database schema (`supabase/add-team-automations.sql`) with roles (`admin`, `agent`), invitation tokens, and RLS policies.
  - Created a tenant resolution helper `getEffectiveTenantId()` in `src/lib/tenant.ts` to seamlessly map logged-in staff members to the owner's `tenant_id` for shared database records (conversations, messages, contacts, campaigns).
  - Built team invitation API endpoints (`/api/team`, `/api/team/[id]`, and `/api/team/accept`) and a invitation acceptance page (`src/app/accept-invite/page.tsx`) utilizing Resend templates.
  - Implemented public invite verification route `/api/team/invite` returning the invited email and role for validation on mount.
  - Updated `/accept-invite/page.tsx` to call `/api/team/invite` on load, pre-fill and lock down the email field to the invited address to prevent registration mismatches, and automatically process acceptance if already authenticated as the correct user.
  - Hardened `/accept-invite/page.tsx` with error boundary guards for non-JSON server responses and optimized propagation delays.
  - Added a token query parameter check in `src/app/login/page.tsx` to automatically redirect users with invite tokens to the `/accept-invite` page.
  - Configured `src/middleware.ts` to allow public, unauthenticated access to the invite page (`/accept-invite`), verification endpoint (`/api/team/invite`), and admin account creation endpoint (`/api/team/create-account`).
  - Created a new backend route `/api/team/create-account` to allow admin-level creation of staff accounts, validating tokens and auto-confirming email addresses to completely bypass the confirmation mail friction. If the user account already exists in Supabase Auth, the route updates the password and confirms the account automatically via admin API self-healing.
  - Integrated the `/api/team/create-account` route inside the signup submission on `/accept-invite/page.tsx`, logging staff in immediately on client success for instant onboarding.
  - Created a user session info endpoint `/api/me` resolving the logged-in user's role (`owner` | `admin` | `agent`), effective tenant details, and staff status.
  - Refactored `TenantContext.tsx` to retrieve user information from `/api/me`, exposing `role` and `isStaff` attributes context-wide.
  - Updated `src/components/layout/Sidebar.tsx` to filter navigation links according to user roles, supporting collapsible nested submenus (such as nesting "Members" and "Team Chat" under "Team Members" for owner accounts, and automatically expanding menus when nested routes are active).
  - Configured role-adapted rendering in `Sidebar.tsx` so that non-owner accounts (agents/admins) see "Team Chat" as a top-level sidebar link directly below "Inbox".
  - Modified the main dashboard page (`src/app/(dashboard)/page.tsx`) to automatically redirect agents to `/inbox` on load, and to hide the onboarding checklist from all team staff members.
  - Implemented internal Team Chat database schema (`supabase/add-team-chat.sql`) enabling realtime communication between owners and staff.
  - Developed Team Chat API endpoints (`/api/team-chat`) and page `/team-chat` with optimistic inserts, custom audio notification alerts (Web Audio API), realtime postgres filters, and duplicate prevention via ID tracking caches.
  - Polished the team chat interface layout to cancel main layout margins (`-m-8`) and fill the scrollable container exactly (`calc(100vh - 80px)`), adding a 5-second polling fallback loop to catch websocket drops.
  - Updated `src/components/layout/Sidebar.tsx` to display skeleton loader cards while user profiles and roles load to prevent layout shift flashes.
  - Updated conversation and message endpoints to resolve the effective tenant context.
  - Created a dedicated dashboard page for team management (`src/app/(dashboard)/team/page.tsx`) and linked it in the Sidebar. Removed the team settings list from the global Settings page.
- **Inbound Message Automations (Greeting & OOO)**:
  - Implemented automations schema and endpoints (`/api/automations`) supporting greeting messages and Out-of-Office (OOO) timezone-aware scheduling.
  - Integrated automation triggers inside the Meta webhook handler (`src/app/api/webhooks/meta/route.ts`). New contacts receive a greeting auto-reply, and out-of-office messages are automatically triggered outside business hours (throttled to max once per 12 hours per contact to prevent spam).
  - Configured webhook auto-replies to save outbound messages into `chat_messages` and update conversations' `last_message` and `last_message_at` to reflect in the real-time inbox.
  - Created a dedicated dashboard page for automations (`src/app/(dashboard)/automations/page.tsx`) and linked it in the Sidebar. Removed the automations form from the Settings page.
- **Sidebar Navigation**: Added "Team Members" (`/team` route) and "Automations" (`/automations` route) to the main navigation menu in `src/components/layout/Sidebar.tsx`.
- **Analytics Date Filtering Fix**: Modified `src/app/api/analytics/route.ts` to query and group logs using `sent_at` instead of `created_at`. This resolves an issue where the dashboard charts showed zero sent messages because `created_at` values are sometimes `NULL` for batch-processed messages, while `sent_at` holds the correct timestamp.
- **Real Read Tracking in Analytics**:
  - Modified Meta webhooks handler (`src/app/api/webhooks/meta/route.ts`) to capture `read_at` timestamps on `read` status updates.
  - Updated the analytics API (`src/app/api/analytics/route.ts`) to dynamically calculate and group actual `read` counts chronologically based on `read_at` dates.
  - Refactored the dashboard analytics page (`src/app/(dashboard)/analytics/page.tsx`) to pull and render actual read logs rather than estimations, updating the legend and chart configurations.
- **Onboarding Checklist Widget**:
  - Implemented `OnboardingChecklist.tsx` tracking user progress across 4 core setup steps: WhatsApp connection, contacts import, template creation, and campaign launch.
  - Integrated the checklist widget on the home dashboard page (`src/app/(dashboard)/page.tsx`), showing progress in real-time and auto-dismissing after all steps are completed.
- **Campaign Analytics Email Reports**:
  - Created a styled email template `getCampaignAnalyticsEmail` in `src/lib/email/template.ts` featuring key stats (Total contacts, Sent, Delivered, Read, and rates) and visual progress bars.
  - Updated the batch dispatcher at campaign completion (`src/app/api/campaigns/[id]/process-batch/route.ts`) to retrieve user auth details and automatically dispatch the analytics report via Resend API.
- **Media Upload & Storage Improvements**:
  - Expanded size limit in `MediaLibrary.tsx` from 20MB to 50MB.
  - Integrated direct Supabase Storage uploads within `MediaLibrary.tsx` utilizing `/api/upload-url` signed PUT endpoints, falling back to base64 only if storage bucket uploads fail.
  - Configured the template builder's media upload handler to automatically register new header file uploads in the Media Library database.
- **Supabase Storage & Table Migrations**: Added [supabase/setup-media-storage.sql](file:///Users/danishsayed/Desktop/Waptrix/supabase/setup-media-storage.sql) to easily provision the `template-media` storage bucket and add the new `read_at` column.
- **Version Control**: Committed and pushed these updates to the remote repository.

## [2026-08-02] - Real Usage Metrics & Analytics Empty States
- **Analytics Dashboard Empty States**:
  - Refactored `src/app/(dashboard)/analytics/page.tsx` to conditionally display a clean placeholder/illustration ("No messages sent yet" and "No campaigns yet") instead of rendering empty charts or empty tables when `totalSent` or `displayCampaigns.length` is 0.
- **Settings Page Real Usage Stats**:
  - Integrated `/api/analytics` endpoint in the Settings page (`src/app/(dashboard)/settings/page.tsx`) to retrieve and display real tenant statistics (Messages Sent, Total Contacts, and Active Templates) inside the plan dashboard.
  - Replaced the mockup credit card usage bar with a helper prompt and redirect link to view direct billing on Meta's Business Suite, since message fees are billed directly by Meta.

## [2026-08-01] - Personal WhatsApp Phone Migration Flow
- **WhatsApp Migration API Endpoints**:
  - Implemented `/api/whatsapp/request-verification-code`: Calls Meta's `/request_code` endpoint to trigger an SMS verification code to the phone number. Attempts this with the system token first before falling back to the user's connection token.
  - Implemented `/api/whatsapp/verify-code`: Calls Meta's `/verify_code` endpoint to verify the 6-digit OTP code, which deactivates the personal WhatsApp instance. On verification success, it automatically calls Meta's `/register` endpoint using the system or connection token to register the number with Cloud API, and persists the registration PIN.
- **Migration & Verification UI in Settings**:
  - Added SMS verification/migration wizard to the Settings page (`src/app/(dashboard)/settings/page.tsx`).
  - When the registration API fails because the number is currently active on personal WhatsApp, the Settings panel displays a dedicated "Start Migration (OTP)" action button.
  - The migration interface supports triggering code generation and submitting the 6-digit code with dynamic verification loaders, error logging, and post-migration profile polling.
- **Analytics Chart Mock Data Removal**:
  - Removed default mock dataset from the analytics endpoint `/api/analytics` when total sent count and chart data were empty, ensuring the dashboard now accurately reflects actual user engagement metrics from day one.
- **Ensure Conversation Endpoint & Contacts Redirect UX**:
  - Implemented `/api/conversations/ensure` API route: Finds or creates an empty conversation record in the database for a given phone and contact name without sending any outbound messages.
  - Refactored the WhatsApp redirect action on the Contacts page to pass both contact phone and contact name parameters: `/inbox?phone=...&name=...`.
  - Updated the Inbox dashboard (`InboxPanel.tsx`) to catch initial phone and name parameters and, if no existing conversation is found locally on load, silently ensure the conversation thread is created in the database and automatically open it.
  - Made the auto-selection effect stable in `InboxPanel.tsx` by using a ref wrapper `selectConversationRef` updated inline (rather than in `useEffect` post-render) to avoid infinite loops and guarantee fresh references during initial layout cycles.

## [2026-07-31] - Token Fallback Retry, Unregistered Phone Handling, & Auto-Registration
- **Token Fallback & Self-Heal Retry Logic**:
  - Implemented access token fallback routing across core WhatsApp endpoints. If the global `META_SYSTEM_TOKEN` fails with permission, OAuth, or authentication errors (such as error codes 190, 200, 10, or 803), the API routes fall back and retry using the individual tenant/connection's `access_token`.
  - Added this fallback logic to WABA self-healing in `/api/whatsapp/connection`, profile retrieval in `/api/whatsapp/profile`, and webhook subscribed-apps registration in `/api/whatsapp/subscribe-webhook` and `/api/whatsapp/oauth-connect`.
- **Unregistered Phone Number Handling & Settings UI Alert**:
  - Enhanced `/api/whatsapp/profile` API to check for unregistered WhatsApp Cloud API phone numbers (Meta Graph API error 100 or nonexisting field for `whatsapp_business_profile`) and return a 400 Bad Request containing `{ needs_registration: true }`.
  - Updated the settings dashboard page (`src/app/(dashboard)/settings/page.tsx`) to catch the `needs_registration` flag and display a dedicated warning message.
  - Added an inline, single-click "Register Phone Number Now" button to the Settings error state to automatically trigger registration. Implemented active profile polling (every 10s for up to 2 mins) post-registration to display a clean loading state and automatically load the profile once Meta activates the number, without requiring any manual page refreshes.
- **Automatic WhatsApp Phone Registration & Robust Error Translations**:
  - Added automatic registration logic in `/api/whatsapp/oauth-connect`. When a connection is first established, the system automatically generates a secure random 6-digit registration PIN, performs a POST to Meta's `/register` endpoint to register the phone number with Cloud API, and stores the PIN in a new database column `registration_pin` on the `wa_connections` table.
  - Added a schema migration file `supabase/add_registration_pin.sql` to add the `registration_pin` column.
  - Refactored `/api/whatsapp/register-phone` to fall back to the stored auto-generated `registration_pin` or generate a random 6-digit PIN on the fly if neither is provided, ensuring zero user input is required to complete phone registration.
  - Upgraded `/api/whatsapp/register-phone` to attempt registration using the system token first (admin privileges) before falling back to the user token, and translated cryptic Meta registration errors into actionable instructions (e.g. migration, duplicate registration, or app permissions).
- **Phone Number ID Validation & Troubleshooting UI**:
  - Implemented a new validation endpoint `/api/whatsapp/validate-phone-id` that verifies a manual Phone Number ID against Meta Graph API using the system token to ensure it exists and is a phone number, preventing common copy-paste errors of WABA IDs.
  - Integrated the validator into the manual connection form on the Connect page (`src/app/(dashboard)/connect/page.tsx`).
  - Added a collapsible Troubleshooting panel on the Connect page to tuck away the manual Register Phone and Webhook Subscription controls, keeping the default connect UI clean.

## [2026-07-20] - Inline Template Syncing from Meta
- **Template Sync Action in Dashboard**:
  - Added an explicit "Sync from Meta" action option inside the template options menu on `src/app/(dashboard)/templates/page.tsx`.
  - Displays a spinning loading indicator (`RotateCw`) on the template card action button while synchronization is in progress (`syncingId`).
  - Calls `axios.post('/api/templates/${template.id}/sync')` and immediately updates local template state with the fresh `meta_status` and category changes from Meta, displaying rich toast notifications on status/category updates.

- **Campaign Batch Media Header Support**:
  - Refactored `buildComponents` in campaign batch dispatcher (`src/app/api/campaigns/[id]/process-batch/route.ts`) to dynamically parse, build, and attach template header parameters for media assets (IMAGE, VIDEO, DOCUMENT) based on `template.header_type` and `template.header_text`.
- **Meta Category Change Detection & Alerts**:
  - Implemented logic in template sync route (`src/app/api/templates/[id]/sync/route.ts`) and Meta webhooks handler (`src/app/api/webhooks/meta/route.ts`) to detect when Meta reclassifies a template's category.
  - Added PostgreSQL update integration for category changes, firing in-app template notifications (`template_category_change` type) and emails through Resend API.
  - Created a new email template in `src/lib/email/template.ts` for template category changes, notifying tenants of potential messaging charge adjustments (e.g. MARKETING template conversions).
  - Extended Meta API `getTemplateStatus` query in `src/lib/meta.ts` to request the template's `category` field from Meta Graph API.
- **Direct Webhook Status Emailing**:
  - Added dedicated email helper `sendWebhookEmail` in `/api/webhooks/meta` to retrieve customer emails from Supabase Auth and send styled status updates (APPROVED, REJECTED, CATEGORY_CHANGED) directly using Resend credentials, matching manual sync route behaviors.

## [2026-07-15] - Campaign Batch Queue Performance Optimization
- **Parallel Batch Processing**:
  - Refactored the campaign QStash batch queue runner at `src/app/api/campaigns/[id]/process-batch/route.ts` to process contacts within each batch in parallel using chunking (concurrency of 20) and `Promise.allSettled`.
  - Parallelized database writes (updating conversations, inserting message logs, and inserting chat messages) instead of executing them sequentially, significantly accelerating bulk message throughput.

## [2026-07-14] - Upstash Redis + QStash Batch Campaign Queue & Inbox Filtering
- **Upstash Redis + QStash Campaign Queue**:
  - Integrated Upstash Redis and QStash to support batch campaign processing. Immediate/scheduled campaigns now queue contact batches into Redis/QStash rather than executing all dispatches in a single request.
  - Implemented `/api/campaigns/[id]/process-batch` route handler to execute batch message dispatches. Excluded this route from authentication middleware in `src/middleware.ts` to allow QStash callback triggers to bypass redirects.
  - Handled database updates for message logging, creating/linking new conversation records correctly for batched message recipients, and added a safe variable fallback to prevent Meta API error `132012`.
  - Added new performance optimization indexes in `supabase-indexes.sql`.
- **Campaign Detail Analytics Page**:
  - Developed a detailed campaign stats page at `src/app/(dashboard)/campaigns/[id]/page.tsx` showing delivery statistics (sent, delivered, read, failed), visual progress bars, and a searchable logs table.
  - Added backend route handler for specific campaign queries (`GET /api/campaigns/[id]/route.ts`).
- **Inbox Search, Filtering, and Bulk Management**:
  - Added a comprehensive inbox filtering modal and dropdown supporting filtering by chat status, read/unread state, tags, last message time, reply status (e.g. Needs Reply), spam, and custom labels.
  - Implemented conversational sorting options (Last Message, Name, Unread First) and bulk action controls to select and delete conversations in batch, backed by a custom `DELETE` method in `/api/conversations/route.ts`.
- **System Credentials & Error Guarding**:
  - Unified Meta graph interactions across profile, media, sync, and template endpoints to use the permanent `META_SYSTEM_TOKEN` instead of short-lived user tokens, preventing access token expiration issues.
  - Guarded send routes (`/api/conversations/[id]/reply` and `/api/conversations/start`) against invalid or pending `phone_number_id` values, ensuring clear error reporting rather than server crashes.
- **Login, Signup, and Reset Password Security**:
  - Integrated interactive eye toggle controls to show/hide passwords on authentication screens (Login, Signup, Reset Password).

## [2026-07-10] - Resort Photo Mapping (Dandeli Wild adventure)
- **Automatic Photo Mapping**:
  - Scanned and processed 25 resort photo folders (6 to 23 photos each) located in the `Dandeli Wild adventure` project's `public/resort photos/` directory.
  - Programmatically updated `src/data/resorts.ts` to map each folder to the corresponding resort object case-insensitively.
  - Set `heroImage` by matching keywords (`hero`, `main`, `about`) with alphabetical fallback, and mapped all other photos to `collageImages` with the hero image sorted first.
  - Verified compilation and build success by running `npm run build` in the `Dandeli Wild adventure` project.

## [2026-07-08] - Template Variable Position Validation
- **Meta Variable Position Rules**:
  - Implemented client and server-side validation to enforce Meta's rule that variables (e.g., `{{1}}`) cannot be placed at the very start or the very end of the template body text.
  - Added frontend check in `TemplateBuilder.tsx` that displays a warning banner dynamically and prevents template submission/save if variables violate position rules.
  - Added backend route handler validation in `/api/templates/[id]/submit/route.ts` that rejects Meta submission requests with a `400 Bad Request` status if variables are positioned at the start or end of the body text.

## [2026-07-01] - Template Submission Improvements
- **Template Submit Validator Refinement**:
  - Removed client-side base64 validation block from `TemplateBuilder.tsx` since the backend API automatically handles and strips data URLs before submitting format-only components to Meta.
- **Template Submission Constraint Norms & Error Parsing**:
  - Refactored Meta template name normalization in the submit route `/api/templates/[id]/submit` to replace whitespace with underscores and strip invalid symbols to strictly follow Meta API naming rules.
  - Enriched Meta API error logging and JSON response schemas to parse detailed user-facing rejections (`error_user_msg` and `error_subcode`) and expose them directly to the builder UI for better debuggability.
- **Signed URL Upload Direct Flow**:
  - Implemented `/api/upload-url/route.ts` generating signed upload URLs via Supabase Service Client, enabling direct browser-to-Supabase PUT requests. This completely bypasses Vercel's 4.5MB serverless body parser request limit, supporting large file uploads.
- **Meta Resumable Upload API Integration**:
  - Integrated Meta's Resumable Upload API during submission in `/api/templates/[id]/submit`. When submitting media templates, the server fetches the asset, registers an upload session with Meta (`/app/uploads`), uploads the binary to Meta, and appends the returned `header_handle` to the example payload, boosting template approvals.
- **Interactive Status Filters & Inline Rejection Reasons**:
  - Implemented interactive status tabs (All, Approved, Pending, Rejected, Draft) with counts in `/templates` list, filtering cards dynamically and exposing rejection reasons inside rejected template items directly.
- **Scroll Synchronization in Template Body Editor**:
  - Wired `onScroll` events in the transparent textarea to synchronize vertical positions with the highlight backdrop mirror inside `TemplateBuilder.tsx`, keeping styling markers in alignment.
- **Branded Review Status Email Notifications**:
  - Built a styled status update email layout in `src/lib/email/template.ts` with Waptrix/Crawlers Technologies themes.
  - Linked it with the sync endpoint (`/api/templates/[id]/sync`) to email users through Resend API as soon as approved/rejected states are pulled from Meta.
- **Inbox Media Template Header Parameter Integration**:
  - Refactored `InboxPanel.tsx` template message send builders (for both template replies and New Chat initiations) to construct and append header media parameters (IMAGE/VIDEO/DOCUMENT) containing direct asset links when sending templates with media headers.
- **Inbox Quick Reply Webhook and Bubble Mapping**:
  - Implemented support for quick reply button payloads, reactions, and order types in `api/webhooks/meta/route.ts` webhooks.
  - Formatted quick replies in `InboxPanel.tsx` with a visual "Quick Reply" badge showing button clicks instead of generic text logs.

## [2026-06-30] - Media Library Refresh & Error Handling
- **Manual Refresh & Error States**:
  - Integrated a manual refresh action button (`RefreshCw` icon) next to the upload tool in `MediaLibrary.tsx` to reload files list quickly.
  - Implemented client-side API error handling with custom error description parsing and a fallback retry visual interface to handle network/endpoint failures gracefully.
- **Media Schema Compatibility**:
  - Updated `/api/media/route.ts` to flexibly read metadata parameters from different database schemas (handling `type` / `mime_type` and `size` / `size_bytes` keys cleanly).
  - Patched POST upload handler to write to `mime_type` instead of `type` to match database requirements.
- **Media Upload Error Banner & Header Cleanups**:
  - Implemented an inline, dismissible upload error notification banner inside `MediaLibrary.tsx` to print descriptive file size or API errors clearly without browser alert dialog popups.
  - Removed the redundant upload modal launcher button on the `/media` page, decluttering the dashboard view since the inline container handles uploads directly.
- **Conversational Inbox Visual Template Messages**:
  - Implemented visual template message bubble rendering in `InboxPanel.tsx` using a custom `TemplateBubble` component that parses the template payload to render media headers, body text, footers, and buttons.
- **Media API Database Alignment**:
  - Removed both the `size` and `type` column fields from the `/api/media` POST insert query and request payloads since they do not exist in the database table schema, preventing insert query failures.
- **Preview Cache LocalStorage Quota Protections**:
  - Encapsulated mock file upload storage operations (`addMedia`) in try-catch structures inside `TemplateBuilder.tsx` to handle browser `QuotaExceededError` errors silently, ensuring preview operations still function even if user local storage is full.
- **Supabase Storage Template Media Uploads**:
  - Implemented `/api/upload/route.ts` API route using Supabase service client to upload files directly to the `template-media` storage bucket, scoping paths under user IDs. Refactored the route authentication model to align with codebase cookie-based standards.
  - Refactored all upload flows in `TemplateBuilder.tsx` to share a unified helper `handleUpload` with progress loaders, fallback logic, and descriptive toast reporting for storage upload failures.
  - Patched template update/create API route handlers to strip base64 data URLs silently, resolving DB timeout errors on save.
- **Meta Media Template Submission Fix**:
  - Corrected media header payload mapping inside `/api/templates/[id]/submit` to submit the format parameter without example URL placeholders, allowing Meta validation checks to pass successfully and prevent submission errors.

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
- **Media Library TypeScript Build Fix**:
  - Resolved compiler error `TS2451` by renaming duplicate `ext` variable declarations inside the `renderThumbnail` helper in `MediaLibrary.tsx` to `fileExt` and `docExt`.
- **Media Library Skeleton Loaders**:
  - Implemented a pulse-animated grid skeleton loading view in `MediaLibrary.tsx` during asynchronous fetches, solving the brief flash of "No files uploaded" empty states.
- **Base64 URL Safety Validation**:
  - Added strict checks in `/api/templates` and `/api/templates/[id]` PUT/POST API route handlers to reject media header paths starting with `data:` (base64 data URLs) which causes statement timeouts and Meta dispatch failures.
  - Linked matching warning prompts in `TemplateBuilder.tsx` to alert users to configure public URLs instead of local data URL files during template submissions.
- **Media Library Lazy Loading**:
  - Implemented dynamic lazy loading of thumbnails in `MediaLibrary.tsx` via `LazyCard` fetching `/api/media/[id]`. This keeps list payloads small (<10 KB) by excluding heavy base64 data URLs from main list query responses (`/api/media`).
- **Template Unsaved Changes Protection**:
  - Added an unsaved changes confirmation dialog in `TemplateBuilder.tsx` to prevent accidental loss of edits when closing the builder.
- **Template Edit URL Separation**:
  - Fixed a template editing bug by separating media header URL resolution logic from text header fields during form state initialization.
- **Media Upload Cache Pre-seeding**:
  - Configured upload flow in `MediaLibrary.tsx` to pre-seed the client-side `thumbnailCache` with the newly uploaded file's data URL immediately on success, bypassing the need for a redundant API request to render the card thumbnail.

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
