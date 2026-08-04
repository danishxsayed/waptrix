-- Team Chat: internal messages between owner and staff
CREATE TABLE IF NOT EXISTS team_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,   -- owner's tenant_id (shared by all staff)
  sender_id     uuid NOT NULL,   -- auth user id of sender
  sender_email  text NOT NULL,
  message       text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_messages_tenant_created
  ON team_messages (tenant_id, created_at DESC);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Owners can see/insert messages where tenant_id = their user id
CREATE POLICY "owner_all" ON team_messages
  FOR ALL USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

-- Staff members can see/insert messages for their owner's tenant
-- (tenant_id matches their owner_tenant_id in team_members)
CREATE POLICY "staff_all" ON team_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE member_user_id = auth.uid()
        AND owner_tenant_id = team_messages.tenant_id
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE member_user_id = auth.uid()
        AND owner_tenant_id = team_messages.tenant_id
        AND status = 'active'
    )
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
