-- Add pending_plan_id to tenants so the selected plan survives
-- the full signup → verify email → onboarding flow in the DB.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pending_plan_id TEXT DEFAULT NULL;
