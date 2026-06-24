export const dynamic = "force-dynamic";

/**
 * Campaign Worker — called by Vercel Cron every minute.
 * Picks up campaigns with status='scheduled' whose scheduled_at has passed
 * and executes the send.
 *
 * Secured by CRON_SECRET header (set in Vercel env vars).
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { executeCampaignSend } from '@/lib/campaign-sender';

export async function GET(req: Request) {
  // Verify this is called by Vercel Cron (or internal)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Find all scheduled campaigns whose time has come
  const { data: due, error } = await db
    .from('campaigns')
    .select('id, name, tenant_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(10); // process up to 10 per cron tick to avoid timeout

  if (error) {
    console.error('Worker: failed to fetch due campaigns:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No campaigns due' });
  }

  console.log(`Worker: processing ${due.length} scheduled campaign(s)`);

  const results: { id: string; name: string; status: string }[] = [];

  for (const campaign of due) {
    // Mark as queued immediately so parallel cron ticks don't double-fire
    await db.from('campaigns').update({ status: 'queued' }).eq('id', campaign.id);

    try {
      await executeCampaignSend(campaign.id);
      results.push({ id: campaign.id, name: campaign.name, status: 'sent' });
    } catch (err: any) {
      console.error(`Worker: campaign ${campaign.id} failed:`, err.message);
      await db.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
      results.push({ id: campaign.id, name: campaign.name, status: 'failed' });
    }
  }

  return NextResponse.json({ processed: due.length, results });
}
