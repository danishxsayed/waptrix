-- Add quality_rating to wa_connections (tracks phone number quality from Meta)
ALTER TABLE wa_connections
  ADD COLUMN IF NOT EXISTS quality_rating TEXT DEFAULT NULL;

-- Add rejection_reason to templates (populated when Meta rejects a template)
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;
