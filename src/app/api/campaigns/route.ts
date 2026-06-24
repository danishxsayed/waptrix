export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { executeCampaignSend } from '@/lib/campaign-sender';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// ── Fire any overdue scheduled campaigns for this tenant (background) ──
async function processDueCampaigns(tenantId: string) {
  const db = serviceClient();
  const { data: due } = await db
    .from('campaigns')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  if (!due || due.length === 0) return;

  for (const campaign of due) {
    // Mark queued immediately to prevent double-fire on concurrent requests
    const { data: claimed } = await db
      .from('campaigns')
      .update({ status: 'queued' })
      .eq('id', campaign.id)
      .eq('status', 'scheduled') // only update if still scheduled (atomic guard)
      .select('id')
      .single();

    if (claimed) {
      executeCampaignSend(campaign.id).catch((err) =>
        console.error(`Scheduled campaign ${campaign.id} failed:`, err.message)
      );
    }
  }
}

// ── GET — list campaigns ──────────────────────────────────
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = serviceClient();
    const { data, error } = await db
      .from('campaigns')
      .select('*, template:templates(*), segment:segments(*)')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fire any overdue scheduled campaigns in background — piggybacks on the
    // 10-second poll so campaigns fire within 10s of their scheduled time,
    // no cron upgrade needed.
    waitUntil(processDueCampaigns(user.id).catch(console.error));

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — create + launch campaign ──────────────────────
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const name       = body.name;
    const templateId = body.templateId || body.template_id;
    const segmentId  = body.segmentId  || body.segment_id;

    if (!name)       return NextResponse.json({ error: 'Campaign name is required' },    { status: 400 });
    if (!templateId) return NextResponse.json({ error: 'Template is required' },         { status: 400 });
    if (!segmentId)  return NextResponse.json({ error: 'Segment/audience is required' }, { status: 400 });

    const { variable_mapping, send_now, scheduled_at } = body;

    // Immediate if send_now=true OR no scheduled_at OR scheduled_at is in the past
    const isImmediate  = send_now === true || !scheduled_at || new Date(scheduled_at) <= new Date();
    const finalStatus  = isImmediate ? 'queued' : 'scheduled';
    const finalScheduledAt = isImmediate ? new Date().toISOString() : scheduled_at;

    const db = serviceClient();

    const { data: campaign, error } = await db
      .from('campaigns')
      .insert({
        tenant_id:        user.id,
        name,
        template_id:      templateId,
        segment_id:       segmentId,
        variable_mapping: variable_mapping || {},
        scheduled_at:     finalScheduledAt,
        status:           finalStatus,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (isImmediate) {
      // Fire-and-forget via Vercel waitUntil — response returns instantly
      waitUntil(
        executeCampaignSend(campaign.id).catch((err) =>
          console.error(`Background send failed for campaign ${campaign.id}:`, err.message)
        )
      );
    }
    // Scheduled campaigns are picked up every minute by /api/worker/campaigns (Vercel Cron)

    return NextResponse.json(campaign);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
