-- Add registration_pin to wa_connections
-- Stores the auto-generated PIN used to register the phone with Meta Cloud API
-- so re-registration can be done automatically without user input.
ALTER TABLE wa_connections
ADD COLUMN IF NOT EXISTS registration_pin TEXT;
