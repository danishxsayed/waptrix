-- ============================================================
-- Waptrix: Team Members + Automations
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Team Members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_tenant_id  uuid NOT NULL,               -- owner's auth.users id
  member_user_id   uuid,                         -- staff's auth.users id (null until accepted)
  email            text NOT NULL,
  role             text NOT NULL DEFAULT 'agent',-- 'admin' | 'agent'
  status           text NOT NULL DEFAULT 'pending', -- 'pending' | 'active'
  invite_token     text UNIQUE DEFAULT gen_random_uuid()::text,
  invited_at       timestamptz DEFAULT now(),
  accepted_at      timestamptz,
  UNIQUE(owner_tenant_id, email)
);

-- Index for fast member lookup during API auth
CREATE INDEX IF NOT EXISTS idx_team_members_member_user_id
  ON team_members(member_user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_team_members_owner
  ON team_members(owner_tenant_id);

CREATE INDEX IF NOT EXISTS idx_team_members_invite_token
  ON team_members(invite_token) WHERE status = 'pending';

-- RLS: owners manage their own team; members can read their own row
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage team" ON team_members;
CREATE POLICY "Owners manage team"
  ON team_members FOR ALL
  TO authenticated
  USING  (owner_tenant_id = auth.uid())
  WITH CHECK (owner_tenant_id = auth.uid());

DROP POLICY IF EXISTS "Members view own row" ON team_members;
CREATE POLICY "Members view own row"
  ON team_members FOR SELECT
  TO authenticated
  USING (member_user_id = auth.uid());


-- ── 2. Automations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  type         text NOT NULL,          -- 'greeting' | 'ooo'
  enabled      boolean NOT NULL DEFAULT false,
  message      text NOT NULL DEFAULT '',
  -- OOO schedule (24h format, in tenant's local timezone offset stored separately)
  ooo_start    int DEFAULT 18,         -- hour OOO starts (18 = 6 PM)
  ooo_end      int DEFAULT 9,          -- hour OOO ends   (9  = 9 AM)
  timezone     text DEFAULT 'Asia/Kolkata',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(tenant_id, type)
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage automations" ON automations;
CREATE POLICY "Tenants manage automations"
  ON automations FOR ALL
  TO authenticated
  USING  (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- ── 3. Pre-populate default automation rows for existing tenants ─
-- (new tenants get rows on first fetch/save in the API)

-- Done!
-- ============================================================
