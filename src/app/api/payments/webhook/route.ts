export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Verify Cashfree webhook signature
function verifySignature(body: string, signature: string, timestamp: string): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY!;
  const signedPayload = `${timestamp}${body}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64');
  return expected === signature;
}

export async function POST(req: Request) {
  try {
    const rawBody  = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // Verify webhook authenticity (skip in sandbox for easier testing)
    if (process.env.CASHFREE_ENV === 'production') {
      if (!verifySignature(rawBody, signature, timestamp)) {
        console.error('Cashfree webhook: invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    console.log(`Cashfree webhook: ${type}`, JSON.stringify(data).slice(0, 200));

    // Only handle successful payments
    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const { order, payment } = data;
      const db = serviceDb();

      // Store payment record
      await db.from('payments').upsert({
        order_id:      order.order_id,
        plan_id:       order.order_id.split('_')[1]?.toLowerCase() || 'unknown',
        customer_email: order.customer_details?.customer_email,
        amount:        payment.payment_amount,
        currency:      payment.payment_currency,
        status:        'paid',
        cf_payment_id: payment.cf_payment_id,
        paid_at:       new Date().toISOString(),
        raw:           event,
      }, { onConflict: 'order_id' });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Cashfree webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
