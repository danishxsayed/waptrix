-- ============================================================
-- Waptrix WhatsApp Inbox Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. CONVERSATIONS TABLE
-- Tracks one unique conversation per contact phone number per tenant
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone    TEXT        NOT NULL,
  contact_name     TEXT        NOT NULL DEFAULT '',
  last_message     TEXT        NOT NULL DEFAULT '',
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count     INT         NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'open',  -- open | resolved
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, contact_phone)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last
  ON conversations(tenant_id, last_message_at DESC);

-- 2. CHAT MESSAGES TABLE
-- Individual messages in both directions
CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       TEXT        NOT NULL,   -- inbound | outbound
  meta_message_id TEXT,                   -- wamid from Meta (for dedup + delivery tracking)
  type            TEXT        NOT NULL DEFAULT 'text',  -- text | image | document | audio | video | template
  content         TEXT        NOT NULL DEFAULT '',      -- text body
  media_url       TEXT,                   -- URL of media (image, doc, etc.)
  media_id        TEXT,                   -- Meta media object ID
  media_mime      TEXT,                   -- MIME type for display
  status          TEXT        NOT NULL DEFAULT 'sent',  -- sent | delivered | read | failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant
  ON chat_messages(tenant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_meta_id
  ON chat_messages(meta_message_id) WHERE meta_message_id IS NOT NULL;

-- 3. ENABLE SUPABASE REALTIME
-- This allows the frontend to subscribe to live message updates
ALTER TABLE chat_messages  REPLICA IDENTITY FULL;
ALTER TABLE conversations   REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only needed once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 4. ROW LEVEL SECURITY (enable after testing)
-- Uncomment when ready for production
-- ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- 5. VERIFY
SELECT 'conversations' AS table_name, COUNT(*) AS rows FROM conversations
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;
