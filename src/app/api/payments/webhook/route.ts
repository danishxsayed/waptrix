export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/resend';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function verifySignature(body: string, signature: string, timestamp: string): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY!;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}${body}`)
    .digest('base64');
  return expected === signature;
}

const BILLING_LABELS: Record<string, string> = {
  monthly:   'Monthly',
  quarterly: 'Quarterly (3 months)',
  yearly:    'Yearly',
};

const PLAN_AMOUNTS: Record<string, string> = {
  monthly:   '₹1,999',
  quarterly: '₹4,999',
  yearly:    '₹17,999',
};

export async function POST(req: Request) {
  try {
    const rawBody  = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    if (process.env.CASHFREE_ENV === 'production') {
      if (!verifySignature(rawBody, signature, timestamp)) {
        console.error('Cashfree webhook: invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;
    console.log(`Cashfree webhook: ${type}`, JSON.stringify(data).slice(0, 300));

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const { order, payment } = data;
      const db = serviceDb();

      const tags         = order.order_tags || {};
      const billingCycle = tags.billing_cycle || 'monthly';
      const durationDays = parseInt(tags.duration_days || '31', 10);
      const customerEmail = order.customer_details?.customer_email || tags.customer_email || '';

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Resolve tenant_id from email
      let tenantId: string | null = null;
      const { data: tenantRow } = await db
        .from('tenants')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();
      if (tenantRow) tenantId = tenantRow.id;

      // Upsert payment record
      await db.from('payments').upsert({
        order_id:       order.order_id,
        plan_id:        'pro',
        billing_cycle:  billingCycle,
        customer_email: customerEmail,
        amount:         payment.payment_amount,
        currency:       payment.payment_currency,
        status:         'paid',
        cf_payment_id:  payment.cf_payment_id,
        paid_at:        new Date().toISOString(),
        expires_at:     expiresAt.toISOString(),
        tenant_id:      tenantId,
        raw:            event,
      }, { onConflict: 'order_id' });

      // Update tenant plan + expiry if tenant found
      if (tenantId) {
        await db
          .from('tenants')
          .update({
            plan:       'pro',
            plan_expires_at: expiresAt.toISOString(),
          })
          .eq('id', tenantId);
      }

      // Send purchase confirmation email
      if (customerEmail) {
        const label  = BILLING_LABELS[billingCycle] || billingCycle;
        const amount = PLAN_AMOUNTS[billingCycle]   || `₹${payment.payment_amount}`;
        await sendEmail({
          to:          customerEmail,
          subject:     '🎉 Welcome to Waptrix Pro!',
          title:       'Payment Successful — You\'re on Waptrix Pro!',
          message:     `Thank you for subscribing to Waptrix Pro (${label} plan) for ${amount}.\n\nYour plan is now active and expires on ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nYou now have full access to bulk campaigns, automation, analytics, and unlimited conversations.`,
          buttonText:  'Go to Dashboard',
          buttonUrl:   `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Cashfree webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
