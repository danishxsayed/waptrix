-- Add campaign tracking columns to conversations
-- Required by process-batch to show campaign badge in inbox

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_campaign_name TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_last_campaign
  ON conversations (last_campaign_id)
  WHERE last_campaign_id IS NOT NULL;
