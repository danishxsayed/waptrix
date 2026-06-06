# Project Context: Waptrix

## Overview
Waptrix is a professional SaaS platform for WhatsApp Bulk Messaging, built with a modern web stack and integrated with Meta's WhatsApp Business API.

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
- **Middleware**: Handles authentication redirects via Supabase SSR.
- **Client/Server Libs**: Unified Supabase clients in `src/lib/supabase`, Meta API helpers in `src/lib/meta.ts`, and Resend email utilities in `src/lib/email`.
- **API Authentication & RLS Bypass Standard**: Database operations in Next.js API Route Handlers authenticate users using the cookie-reliable `supabase.auth.getUser()`. Query operations are performed using a Supabase `service_role` client to bypass RLS, utilizing manual tenant-level filtering by `user.id`. API request bodies normalize camelCase and snake_case parameters (e.g. `templateId` and `template_id`) seamlessly to ensure robust client and schema alignment.

## Key Integration
- **Meta Embedded Signup**: Custom flow utilizing `NEXT_PUBLIC_META_CONFIG_ID`. Employs direct accessToken storage (`/api/whatsapp/store-token`) during `FB.login` and auto-discovers verified assets via `/api/whatsapp/connect` or `/api/whatsapp/sync-connection` using dual WABA/business lookup methods.
- **Campaign Wizard & Cron Dispatcher**: Endpoints at `/api/campaigns` manage draft and scheduled campaign objects with target segment lists and field mappings with strict validation. The endpoint and frontend `CampaignWizard` support both snake_case database mapping and modern camelCase payloads flawlessly. Standardized status transitions (`'queued'`, `'sending'`, `'sent'`, `'failed'`) synchronize with the client dashboard dynamically. Detailed execution tracking is logged to the `message_logs` table, storing Meta message IDs or exact error descriptions for sandbox diagnostics.
- **Contacts & Niche Library**: Advanced dashboard at `/contacts` managing all user audience sheets and niches. Features quick inline creation, spreadsheet/drag-and-drop parser imports, real-time count badges, on-the-fly niche creation during uploads, and a comprehensive 'Niche & List Library' modal allowing for easy sheet renaming and safe cascading deletions.
- **Webhooks**: Automated status event handling at `/api/webhooks/meta` verifying payload signatures via HMAC SHA-256 using `META_APP_SECRET`. Parses incoming delivery updates and various WhatsApp message types (text, interactive buttons, image, audio, video, document), dynamically mapping incoming events to local threads.
- **Dynamic Analytics & Cross-Route Action Panel**: Unified analytics aggregation route `/api/analytics` fetches campaign delivery indices and chronological message logs while dynamically preserving layout visual integrity for new accounts using mock curve visual overrides. Interactive triggers on the home dashboard wire action clicks to navigate seamlessly to deep nested page modal dialogs (Campaign Wizard, Import CSV drawer) via lightweight client URL hash filters.
- **Real-time Conversational Inbox**:
  - Dedicated interactive `/inbox` route using the glassmorphic `InboxPanel` component.
  - Backed by the local `InboxContext` and Supabase Realtime replication to push live message indicators and content changes to the client.
  - Managed by four specific API routes: fetching conversation lists (`/api/conversations`), listing messages (`/api/conversations/[id]/messages`), marking read threads (`/api/conversations/[id]/mark-read`), and sending replies (`/api/conversations/[id]/reply`).
  - Supports template selection and dynamic text replies with full attachment mime type mapping.

