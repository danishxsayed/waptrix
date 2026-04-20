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

## Key Integration
- **Meta Embedded Signup**: Custom flow using `NEXT_PUBLIC_META_CONFIG_ID`.
- **Webhooks**: Automated status event handling at `/api/webhooks/meta`.
