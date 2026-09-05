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

    // Normalise phones — strip leading + so comparison works both ways
    const normalize = (p: string) => p.replace(/^\+/, '');
    const sentPhones = [...new Set(sentLogs.map((l) => normalize(l.phone)))];

    // Earliest send time for this campaign
    const sentTimes = sentLogs.map((l) => l.sent_at).filter(Boolean);
    const campaignStartedAt = sentTimes.length > 0
      ? sentTimes.reduce((a, b) => (a < b ? a : b))
      : new Date(0).toISOString();

    // 2. Find conversations whose contact_phone matches a sent phone
    //    Build OR filter covering both +91xxx and 91xxx variants
    const phoneFilter = sentPhones
      .flatMap((p) => [`contact_phone.eq.${p}`, `contact_phone.eq.+${p}`])
      .join(',');

    const { data: convs } = await db
      .from('conversations')
      .select('id, contact_phone')
      .eq('tenant_id', tenantId)
      .or(phoneFilter);

    if (!convs || convs.length === 0) {
      return NextResponse.json({ reply_count: 0, replied_phones: [] });
    }

    const convIds = convs.map((c) => c.id);

    // 3. Count conversations that have at least one inbound message AFTER the campaign was sent
    const { data: replyConvs } = await db
      .from('chat_messages')
      .select('conversation_id')
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound')
      .in('conversation_id', convIds)
      .gte('created_at', campaignStartedAt);

    const repliedConvIds = new Set((replyConvs || []).map((m) => m.conversation_id));

    // Map back to phones
    const repliedPhones = convs
      .filter((c) => repliedConvIds.has(c.id))
      .map((c) => c.contact_phone);

    return NextResponse.json({
      reply_count: repliedPhones.length,
      replied_phones: repliedPhones,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
