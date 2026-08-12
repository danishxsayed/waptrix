-- Payments table — records Cashfree transactions
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT UNIQUE NOT NULL,
  plan_id       TEXT NOT NULL,
  customer_email TEXT,
  amount        NUMERIC(10,2),
  currency      TEXT DEFAULT 'INR',
  status        TEXT DEFAULT 'pending',  -- pending | paid | failed
  cf_payment_id TEXT,
  paid_at       TIMESTAMPTZ,
  raw           JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_customer_email ON payments (customer_email);
CREATE INDEX IF NOT EXISTS payments_status         ON payments (status);
