export const dynamic = 'force-dynamic';

/**
 * POST /api/campaigns/[id]/resume
 *
 * Resumes a stuck campaign by re-enqueueing all batches via QStash.
 * process-batch has idempotency — already-sent contacts are skipped automatically.
 * Safe to call multiple times.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { enqueueCampaignBatches } from '@/lib/campaign-queue';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // Auth check
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Only allow resuming campaigns that are stuck in 'sending' or 'queued'
    const { data: campaign } = await db
      .from('campaigns')
      .select('id, status, tenant_id')
      .eq('id', campaignId)
      .eq('tenant_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!['sending', 'queued', 'failed'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Campaign is ${campaign.status} — only stuck campaigns can be resumed.` },
        { status: 400 }
      );
    }

    // Reset to queued then re-enqueue
    await db.from('campaigns').update({ status: 'queued' }).eq('id', campaignId);
    await enqueueCampaignBatches(campaignId);

    return NextResponse.json({ ok: true, message: 'Campaign resumed' });
  } catch (err: any) {
    console.error('[campaign/resume] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
