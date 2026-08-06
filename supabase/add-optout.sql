-- Add timestamp tracking for when a contact sent STOP/START
-- (opted_in column already exists on contacts table)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz;

-- Index to quickly count/filter opted-out contacts per tenant
CREATE INDEX IF NOT EXISTS contacts_optedin_tenant
  ON contacts (tenant_id, opted_in)
  WHERE opted_in = false;
