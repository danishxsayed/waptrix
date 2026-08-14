-- Track individual payment webhook events to prevent duplicate processing
-- and provide a full audit trail of all payment activity

CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT        NOT NULL,
  event_type  TEXT        NOT NULL,  -- PAYMENT_SUCCESS_WEBHOOK | PAYMENT_FAILED_WEBHOOK | PAYMENT_PENDING_WEBHOOK
  cf_event_id TEXT,                  -- Cashfree's unique event ID if present
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  amount      NUMERIC(10,2),
  status      TEXT,
  raw         JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint prevents processing same event twice
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_order_event
  ON payment_events (order_id, event_type);

-- Index for querying by tenant
CREATE INDEX IF NOT EXISTS payment_events_tenant_id ON payment_events (tenant_id);

-- Add phone column to tenants if missing (used by /api/payments/initiate)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add email_sent columns to payments for idempotent email tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS success_email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failed_email_sent  BOOLEAN DEFAULT FALSE;
