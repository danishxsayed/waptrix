-- Notifications table for template status updates (and future alert types)
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'template_status', -- template_status | account_alert | etc.
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  meta          JSONB DEFAULT '{}',          -- extra data: template_name, status, template_id
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups per tenant, ordered by recency
CREATE INDEX IF NOT EXISTS notifications_tenant_created
  ON notifications (tenant_id, created_at DESC);

-- Unread count index
CREATE INDEX IF NOT EXISTS notifications_tenant_unread
  ON notifications (tenant_id, is_read)
  WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'tenant_notifications'
  ) THEN
    CREATE POLICY "tenant_notifications" ON notifications
      FOR ALL TO authenticated
      USING (tenant_id = auth.uid())
      WITH CHECK (tenant_id = auth.uid());
  END IF;
END $$;

-- Add to Supabase Realtime publication (safe — errors if already added are ignored)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN others THEN NULL;
END $$;
