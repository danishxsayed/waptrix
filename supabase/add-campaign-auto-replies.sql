-- Add description and auto_replies to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_replies JSONB DEFAULT '{"enabled": false, "rules": []}'::jsonb;

-- Ensure message_logs has campaign_id (may already exist)
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS message_logs_campaign_id ON message_logs (campaign_id);
CREATE INDEX IF NOT EXISTS message_logs_phone_tenant ON message_logs (tenant_id, phone);
