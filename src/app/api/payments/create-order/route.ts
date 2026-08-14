export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV    = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_BASE   = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export const PLANS: Record<string, {
  name: string;
  amount: number;       // in rupees
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  durationDays: number;
  description: string;
}> = {
  pro_monthly: {
    name:         'Waptrix Pro — Monthly',
    amount:       1999,
    billingCycle: 'monthly',
    durationDays: 31,
    description:  'Waptrix Pro Plan billed monthly',
  },
  pro_quarterly: {
    name:         'Waptrix Pro — Quarterly',
    amount:       4999,
    billingCycle: 'quarterly',
    durationDays: 92,
    description:  'Waptrix Pro Plan billed quarterly (save 17%)',
  },
  pro_yearly: {
    name:         'Waptrix Pro — Yearly',
    amount:       17999,
    billingCycle: 'yearly',
    durationDays: 365,
    description:  'Waptrix Pro Plan billed yearly (save 25%)',
  },
};

export async function POST(req: Request) {
  try {
    const { planId, customerName, customerEmail, customerPhone } = await req.json();

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const orderId = `WPX_${planId.toUpperCase()}_${Date.now()}`;

    const orderPayload = {
      order_id:       orderId,
      order_amount:   plan.amount,
      order_currency: 'INR',
      order_note:     plan.description,
      customer_details: {
        customer_id:    customerEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        customer_name:  customerName || 'Customer',
        customer_email: customerEmail,
        customer_phone: customerPhone || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?order_id={order_id}&order_status={order_status}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      },
      order_tags: {
        billing_cycle:  plan.billingCycle,
        duration_days:  String(plan.durationDays),
        customer_email: customerEmail,
      },
    };

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-version':   '2023-08-01',
        'x-client-id':     CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error('Cashfree order creation failed:', JSON.stringify(cfData));
      return NextResponse.json({ error: cfData?.message || 'Failed to create order' }, { status: 400 });
    }

    return NextResponse.json({
      orderId:          cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      amount:           plan.amount,
      planName:         plan.name,
    });
  } catch (err: any) {
    console.error('create-order error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
