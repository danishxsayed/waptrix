-- Add billing_cycle, expires_at, tenant_id to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'; -- monthly | quarterly | yearly
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id     UUID;

CREATE INDEX IF NOT EXISTS payments_tenant_id  ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS payments_expires_at ON payments (expires_at);
