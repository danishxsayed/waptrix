-- Prevent duplicate phone numbers within the same tenant.
-- First remove any existing duplicates (keep the oldest row).
DELETE FROM contacts
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id, REGEXP_REPLACE(phone, '[^0-9]', '', 'g'))
    id
  FROM contacts
  ORDER BY tenant_id, REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), created_at ASC
);

-- Add unique constraint: one phone number per tenant
-- We use a functional index on digits-only so +91... and 91... are treated as the same.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_phone_unique
  ON contacts (tenant_id, REGEXP_REPLACE(phone, '[^0-9]', '', 'g'));
