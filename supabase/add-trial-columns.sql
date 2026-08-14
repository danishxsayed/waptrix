-- Add trial and plan columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Backfill existing tenants: give them a 7-day trial from now if no plan set
UPDATE tenants
SET
  plan = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days'
WHERE plan IS NULL OR plan = '';

CREATE INDEX IF NOT EXISTS tenants_plan ON tenants (plan);
