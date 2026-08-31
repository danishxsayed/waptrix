-- Add outbound webhook columns to tenants table for CRM integration
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS webhook_url   TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
