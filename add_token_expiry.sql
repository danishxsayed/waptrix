-- Add token_expires_at column to wa_connections
-- Run in Supabase SQL Editor

ALTER TABLE wa_connections
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Verify
SELECT tenant_id, phone_number, token_expires_at FROM wa_connections;
