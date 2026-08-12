export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const CASHFREE_APP_ID  = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET  = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV     = process.env.CASHFREE_ENV || 'sandbox'; // 'sandbox' | 'production'
const CASHFREE_BASE    = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export const PLANS: Record<string, { name: string; amount: number; description: string }> = {
  starter: {
    name:        'Starter',
    amount:      149900, // ₹1,499 in paise
    description: 'Waptrix Starter Plan — 3,000 conversations/month',
  },
  growth: {
    name:        'Growth',
    amount:      399900, // ₹3,999
    description: 'Waptrix Growth Plan — 10,000 conversations/month',
  },
  business: {
    name:        'Business',
    amount:      999900, // ₹9,999
    description: 'Waptrix Business Plan — 50,000 conversations/month',
  },
};

export async function POST(req: Request) {
  try {
    const { planId, customerName, customerEmail, customerPhone } = await req.json();

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Generate a unique order id
    const orderId = `WAPTRIX_${planId.toUpperCase()}_${Date.now()}`;

    const orderPayload = {
      order_id:       orderId,
      order_amount:   plan.amount / 100, // Cashfree expects rupees, not paise
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
    };

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-api-version':  '2023-08-01',
        'x-client-id':    CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error('Cashfree order creation failed:', JSON.stringify(cfData));
      return NextResponse.json(
        { error: cfData?.message || 'Failed to create order' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      orderId:          cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      amount:           plan.amount / 100,
      planName:         plan.name,
    });
  } catch (err: any) {
    console.error('create-order error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
