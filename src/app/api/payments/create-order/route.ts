export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV    = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_BASE   = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(req: Request) {
  try {
    const { planId, customerName, customerEmail, customerPhone } = await req.json();

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      console.error('Cashfree credentials not configured');
      return NextResponse.json({ error: 'Payment gateway not configured. Please contact support.' }, { status: 500 });
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
