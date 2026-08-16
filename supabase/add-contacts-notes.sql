-- Add dedicated notes column to contacts table.
-- Previously notes were stored in custom3 (conflicting with appointment/location JSON).
-- This gives notes a clean, dedicated column shared by both Inbox and Contact Details.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
