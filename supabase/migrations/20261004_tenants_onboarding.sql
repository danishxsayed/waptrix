-- Onboarding data collected from new users after signup
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS is_whatsapp       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'whatsapp', -- whatsapp | phone | email
  ADD COLUMN IF NOT EXISTS industry          TEXT,
  ADD COLUMN IF NOT EXISTS role              TEXT,
  ADD COLUMN IF NOT EXISTS team_size         TEXT,  -- just_me | 2-5 | 6-20 | 20+
  ADD COLUMN IF NOT EXISTS use_cases         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS msg_volume        TEXT,  -- <1k | 1-10k | 10-50k | 50k+
  ADD COLUMN IF NOT EXISTS referral_source   TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_done   BOOLEAN DEFAULT FALSE;
