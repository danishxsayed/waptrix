-- ══════════════════════════════════════════════════════════════
-- Waptrix Performance Indexes
-- Run this in Supabase → SQL Editor
-- Safe to run multiple times (IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════

-- conversations ──────────────────────────────────────────────
-- Most queries filter by tenant_id first, then sort by last_message_at
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last
  ON conversations (tenant_id, last_message_at DESC);

-- Inbox search by phone number
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_phone
  ON conversations (tenant_id, contact_phone);

-- Status filter (open/closed)
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status
  ON conversations (tenant_id, status);

-- chat_messages ──────────────────────────────────────────────
-- Loading messages for a conversation (most common query)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (conversation_id, created_at ASC);

-- Webhook lookup by meta_message_id (delivery receipts)
CREATE INDEX IF NOT EXISTS idx_chat_messages_meta_id
  ON chat_messages (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

-- Tenant-level queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant
  ON chat_messages (tenant_id, created_at DESC);

-- message_logs ───────────────────────────────────────────────
-- Campaign detail page: logs per campaign
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign
  ON message_logs (campaign_id, created_at DESC);

-- Idempotency check in process-batch (campaign + contact)
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_contact
  ON message_logs (campaign_id, contact_id);

-- contacts ───────────────────────────────────────────────────
-- Segment contact fetch (used heavily during campaign send)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_segment
  ON contacts (tenant_id, segment_id);

-- campaigns ──────────────────────────────────────────────────
-- List page: sorted by created_at per tenant
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant
  ON campaigns (tenant_id, created_at DESC);

-- Scheduled campaign picker
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled
  ON campaigns (tenant_id, status, scheduled_at)
  WHERE status = 'scheduled';
