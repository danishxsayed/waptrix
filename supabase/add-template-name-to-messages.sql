-- Store the template name alongside template messages so the inbox
-- can look up and render the full template (image, buttons, body) by name.
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS template_name TEXT;

CREATE INDEX IF NOT EXISTS chat_messages_template_name
  ON chat_messages (template_name)
  WHERE template_name IS NOT NULL;
