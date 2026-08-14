export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend';

// Called daily by Vercel cron — finds plans expiring in 7 days and sends reminder emails
export async function GET(req: Request) {
  // Simple secret guard so only the cron can call this
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Find payments expiring in the next 7 days (status = paid, not yet reminded)
  const now      = new Date();
  const in7Days  = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const { data: expiring, error } = await db
    .from('payments')
    .select('id, customer_email, billing_cycle, expires_at, amount')
    .eq('status', 'paid')
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in7Days.toISOString());

  if (error) {
    console.error('check-renewals query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also remind users whose TRIAL ends in 2 days
  const in2Days = new Date();
  in2Days.setDate(in2Days.getDate() + 2);

  const { data: expiringTrials } = await db
    .from('tenants')
    .select('id, email, name, trial_ends_at')
    .eq('plan', 'trial')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in2Days.toISOString());

  for (const tenant of (expiringTrials || [])) {
    if (!tenant.email) continue;
    const trialEnd  = new Date(tenant.trial_ends_at);
    const daysLeft  = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const pricingUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace('app.', '')}/pricing`;
    await sendEmail({
      to:         tenant.email,
      subject:    `⏰ Your Waptrix free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      title:      'Your Free Trial is Ending Soon',
      message:    `Hi ${tenant.name || 'there'},\n\nYour 7-day free trial ends on ${trialEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nSubscribe now to keep access to all your campaigns, contacts, automations, and inbox — starting at just ₹1,999/month.`,
      buttonText: 'Subscribe Now',
      buttonUrl:  pricingUrl,
    });
    sent++;
  }

  let sent_paid = 0;
  for (const payment of (expiring || [])) {
    if (!payment.customer_email) continue;

    const expiryDate = new Date(payment.expires_at);
    const daysLeft   = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const cycle      = payment.billing_cycle || 'monthly';

    const cyclePrices: Record<string, string> = {
      monthly:   '₹1,999',
      quarterly: '₹4,999',
      yearly:    '₹17,999',
    };
    const cycleIds: Record<string, string> = {
      monthly:   'pro_monthly',
      quarterly: 'pro_quarterly',
      yearly:    'pro_yearly',
    };
    const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;

    await sendEmail({
      to:         payment.customer_email,
      subject:    `⚠️ Your Waptrix Pro plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      title:      'Your Plan is Expiring Soon',
      message:    `Your Waptrix Pro plan (${cycle}) expires on ${expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nRenew now to continue sending campaigns, managing your inbox, and using automations without interruption.\n\nRenewal price: ${cyclePrices[cycle] || '₹1,999'}`,
      buttonText: 'Renew My Plan',
      buttonUrl:  renewUrl,
    });

    sent_paid++;
  }

  const totalSent = sent + sent_paid;
  console.log(`check-renewals: ${sent} trial reminders + ${sent_paid} renewal reminders`);
  return NextResponse.json({ trial_reminders: sent, renewal_reminders: sent_paid, total: totalSent });
}
