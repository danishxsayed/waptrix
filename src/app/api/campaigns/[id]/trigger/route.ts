export const dynamic = 'force-dynamic';

/**
 * POST /api/campaigns/[id]/trigger
 *
 * Called by QStash at the scheduled time to launch a scheduled campaign.
 * Verified by QStash signature — no user auth needed.
 * Simply calls enqueueCampaignBatches which splits into QStash batch jobs.
 */

import { NextResponse } from 'next/server';
import { enqueueCampaignBatches } from '@/lib/campaign-queue';
import { createClient } from '@supabase/supabase-js';

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
  try {
    const { id: campaignId } = await params;

    const db = serviceDb();

    // Verify campaign exists and is still in 'scheduled' state
    const { data: campaign } = await db
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Skip if already launched (QStash retry safety)
    if (campaign.status !== 'scheduled') {
      return NextResponse.json({ message: `Campaign already in status: ${campaign.status}` });
    }

    // Mark as queued then hand off to enqueueCampaignBatches
    await db.from('campaigns').update({ status: 'queued' }).eq('id', campaignId);

    await enqueueCampaignBatches(campaignId);

    return NextResponse.json({ message: 'Campaign launched', campaignId });
  } catch (err: any) {
    console.error('[campaign/trigger] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
