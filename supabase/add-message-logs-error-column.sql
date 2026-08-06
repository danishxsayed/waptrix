-- Add error column to message_logs so campaign failure reasons are stored
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS error text;

-- Index for fast "show me all failed with errors" queries
CREATE INDEX IF NOT EXISTS idx_message_logs_failed
  ON message_logs (campaign_id, status)
  WHERE status = 'failed';
