export const dynamic = 'force-dynamic';

/**
 * POST /api/campaigns/[id]/analytics-email
 *
 * Called by QStash 1 hour after campaign completion.
 * Fetches live stats (with webhook-updated delivered/read counts) and sends email.
 */

import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { createClient } from '@supabase/supabase-js';
import { getCampaignAnalyticsEmail } from '@/lib/email/template';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Verify QStash signature
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY!,
  });

  const rawBody  = await req.text();
  const signature = req.headers.get('upstash-signature') ?? '';

  try {
    await receiver.verify({ signature, body: rawBody });
  } catch {
    console.error('analytics-email: invalid QStash signature');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = serviceDb();

  // Fetch live campaign stats (delivered/read updated by webhooks over the past hour)
  const { data: campaign } = await db
    .from('campaigns')
    .select('name, tenant_id, sent_count, failed_count, delivered_count, read_count, total_contacts, completed_at')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Get tenant email
  const { data: userData } = await db.auth.admin.getUserById(campaign.tenant_id);
  const userEmail = userData?.user?.email;

  if (!userEmail || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'No email or Resend key' }, { status: 400 });
  }

  const totalContacts  = campaign.total_contacts ?? 0;
  const sentCount      = campaign.sent_count      ?? 0;
  const failedCount    = campaign.failed_count     ?? 0;
  const deliveredCount = campaign.delivered_count  ?? 0;
  const readCount      = campaign.read_count       ?? 0;
  const deliveryRate   = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0;
  const readRate       = sentCount > 0 ? Math.round((readCount      / sentCount) * 100) : 0;

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
  const completedAt = campaign.completed_at
    ? new Date(campaign.completed_at).toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      })
    : new Date().toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });

  const html = getCampaignAnalyticsEmail({
    campaignName:  campaign.name || campaignId,
    totalContacts,
    sent:          sentCount,
    failed:        failedCount,
    delivered:     deliveredCount,
    read:          readCount,
    deliveryRate,
    readRate,
    dashboardUrl:  `${appUrl}/analytics`,
    completedAt,
  });

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    'Waptrix <no-reply@waptrix.in>',
      to:      userEmail,
      subject: `📊 Campaign "${campaign.name || campaignId}" — Analytics Report`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Failed to send analytics email:', err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  console.log(`Campaign analytics email sent to ${userEmail} for campaign ${campaignId}`);
  return NextResponse.json({ ok: true });
}
