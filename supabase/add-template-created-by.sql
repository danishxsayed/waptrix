-- Add created_by column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_by_name TEXT;
