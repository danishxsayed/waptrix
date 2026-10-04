export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function razorpayAuth() {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

export async function POST(req: Request) {
  try {
    const { planId, customerName, customerEmail, customerPhone } = await req.json();

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return NextResponse.json({ error: 'Payment gateway not configured. Please contact support.' }, { status: 500 });
    }

    const receipt = `WPX_${planId.toUpperCase()}_${Date.now()}`;

    const orderPayload = {
      amount:   plan.amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt,
      notes: {
        plan_name:      plan.name,
        billing_cycle:  plan.billingCycle,
        duration_days:  String(plan.durationDays),
        customer_email: customerEmail || '',
        customer_name:  customerName  || '',
        customer_phone: customerPhone || '',
      },
    };

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': razorpayAuth(),
      },
      body: JSON.stringify(orderPayload),
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || !rzpData.id) {
      console.error('Razorpay order creation failed:', JSON.stringify(rzpData));
      return NextResponse.json({ error: rzpData?.error?.description || 'Failed to create order' }, { status: 400 });
    }

    return NextResponse.json({
      razorpayOrderId: rzpData.id,
      amountPaise:     rzpData.amount,
      amount:          plan.amount,
      planName:        plan.name,
      receipt,
    });
  } catch (err: any) {
    console.error('create-order error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
