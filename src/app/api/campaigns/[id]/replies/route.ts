export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEffectiveTenantId } from '@/lib/tenant';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    if (!tenantId) return NextResponse.json({ error: 'Workspace not found' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Get all phones sent via this campaign + the earliest sent_at
    const { data: sentLogs } = await db
      .from('message_logs')
      .select('phone, sent_at')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId)
      .neq('status', 'failed');

    if (!sentLogs || sentLogs.length === 0) {
      return NextResponse.json({ reply_count: 0, replied_phones: [] });
    }

    // Normalise phones — strip leading + for consistent comparison
    const normalize = (p: string) => p.replace(/^\+/, '');

    // Build a Set of normalised sent phones for O(1) lookup
    const sentPhoneSet = new Set(sentLogs.map((l) => normalize(l.phone)));

    // Earliest send time for this campaign
    const sentTimes = sentLogs.map((l) => l.sent_at).filter(Boolean);
    const campaignStartedAt = sentTimes.length > 0
      ? sentTimes.reduce((a, b) => (a < b ? a : b))
      : new Date(0).toISOString();

    // 2. Fetch ALL conversations for this tenant — filter in JS to avoid huge OR filter
    //    (Supabase OR strings with 400+ conditions exceed URL limits)
    const { data: convs } = await db
      .from('conversations')
      .select('id, contact_phone')
      .eq('tenant_id', tenantId);

    if (!convs || convs.length === 0) {
      return NextResponse.json({ reply_count: 0, replied_phones: [] });
    }

    // Keep only conversations whose phone matches a sent phone
    const matchedConvs = convs.filter((c) => sentPhoneSet.has(normalize(c.contact_phone)));
    if (matchedConvs.length === 0) {
      return NextResponse.json({ reply_count: 0, replied_phones: [] });
    }

    const matchedConvIds = matchedConvs.map((c) => c.id);

    // 3. Find which of those conversations have at least one inbound message
    //    created AFTER the campaign was sent. Use .in() with the filtered ID list.
    //    Chunk into batches of 200 to stay within Supabase limits.
    const CHUNK = 200;
    const repliedConvIdSet = new Set<string>();

    for (let i = 0; i < matchedConvIds.length; i += CHUNK) {
      const chunk = matchedConvIds.slice(i, i + CHUNK);
      const { data: replyMsgs } = await db
        .from('chat_messages')
        .select('conversation_id')
        .eq('tenant_id', tenantId)
        .eq('direction', 'inbound')
        .in('conversation_id', chunk)
        .gte('created_at', campaignStartedAt);

      (replyMsgs || []).forEach((m) => repliedConvIdSet.add(m.conversation_id));
    }

    // Map replied conv IDs back to phone numbers
    const repliedPhones = matchedConvs
      .filter((c) => repliedConvIdSet.has(c.id))
      .map((c) => c.contact_phone);

    return NextResponse.json({
      reply_count: repliedPhones.length,
      replied_phones: repliedPhones,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
