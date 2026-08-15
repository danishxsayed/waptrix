-- Add billing_info JSONB to tenants for storing billing details
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{}';
