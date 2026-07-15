# Environment Roadmap

This file documents the environment variables required for the project. **Do not store actual values/secrets in this file.**

## Core Variables
- `NEXT_PUBLIC_APP_URL`: The base URL of the application (e.g., `https://waptrix.in`).
- `NEXT_PUBLIC_API_URL`: (Optional) URL for the backend API if different from the app URL.

## Supabase (Database & Auth)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key for client-side API calls.
- `SUPABASE_SERVICE_KEY`: (Secret) Service role key for admin/webhook operations.

## Meta WhatsApp API
- `NEXT_PUBLIC_META_APP_ID`: Your Meta Application ID.
- `NEXT_PUBLIC_META_CONFIG_ID`: The Configuration ID for WhatsApp Embedded Signup.
- `NEXT_PUBLIC_META_VERIFY_TOKEN`: The token used to verify webhooks in the Meta Dashboard.
- `META_APP_SECRET`: (Secret) Your Meta App Secret for secure server-to-server calls.
- `META_VERIFY_TOKEN`: (Internal) Server-side verify token.
- `META_SYSTEM_TOKEN`: (Secret) Permanent System User access token used across all WhatsApp API calls to avoid user token expiry.

## Upstash Redis & QStash (Batch Queue)
- `UPSTASH_REDIS_REST_URL`: (Secret) REST URL for the Upstash Redis database.
- `UPSTASH_REDIS_REST_TOKEN`: (Secret) REST Token for the Upstash Redis database.
- `QSTASH_TOKEN`: (Secret) Token for publishing background batch messages to QStash.

## Legacy / Future
- `JWT_SECRET`: (Unused) Reserved for custom JWT logic.
