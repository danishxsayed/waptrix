-- Add replied_at to message_logs for per-contact reply tracking in campaign analytics
ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;
