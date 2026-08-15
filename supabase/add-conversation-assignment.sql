-- Add assignment columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to   UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_name TEXT;
