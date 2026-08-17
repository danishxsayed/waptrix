-- Ensure message_logs has all columns required by process-batch
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS contact_id  UUID,
  ADD COLUMN IF NOT EXISTS meta_msg_id TEXT,
  ADD COLUMN IF NOT EXISTS sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS error       TEXT;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_id  ON message_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_contact_id   ON message_logs (contact_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_meta_msg_id  ON message_logs (meta_msg_id);
