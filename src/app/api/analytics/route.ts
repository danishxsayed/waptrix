export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/** Return YYYY-MM-DD in UTC from an ISO timestamp string */
function toUTCDate(ts: string): string {
  return ts.slice(0, 10); // ISO strings are always YYYY-MM-DDT... in UTC
}

/** Generate an array of YYYY-MM-DD strings from start to end (inclusive) */
function dateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(23, 59, 59, 999);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/** Format YYYY-MM-DD → "Jun 08" for display */
function fmtLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${String(d).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // ── Date range from query params ──────────────────────────────
    const url = new URL(req.url);
    let fromParam = url.searchParams.get('from');
    let toParam   = url.searchParams.get('to');

    const toDate = toParam ? new Date(`${toParam}T23:59:59Z`) : new Date();
    const fromDate = fromParam
      ? new Date(`${fromParam}T00:00:00Z`)
      : (() => { const d = new Date(toDate); d.setUTCDate(d.getUTCDate() - 29); return d; })();

    // Safety cap: max 90 days
    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
    if (diffDays > 90) fromDate.setUTCDate(toDate.getUTCDate() - 89);

    const fromISO = fromDate.toISOString();
    const toISO   = toDate.toISOString();

    // ── 1. Campaign totals (all-time) ────────────────────────────
    const { data: campaigns } = await serviceClient
      .from('campaigns')
      .select('sent_count, failed_count, delivered_count, read_count')
      .eq('tenant_id', user.id);

    let totalSent = 0, totalFailed = 0, totalDelivered = 0, totalRead = 0;
    (campaigns ?? []).forEach(c => {
      totalSent      += c.sent_count      || 0;
      totalFailed    += c.failed_count    || 0;
      totalDelivered += c.delivered_count || 0;
      totalRead      += c.read_count      || 0;
    });

    let deliveryRate = 100;
    if (totalSent > 0) {
      if (totalDelivered > 0) {
        deliveryRate = (totalDelivered / totalSent) * 100;
      } else if (totalFailed > 0) {
        deliveryRate = (totalSent / (totalSent + totalFailed)) * 100;
      }
    }

    // ── 2. Contacts + templates ──────────────────────────────────
    const [{ count: contactsCount }, { count: templatesCount }] = await Promise.all([
      serviceClient.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id),
      serviceClient.from('templates').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id),
    ]);

    // ── 3. Message logs + outbound chat messages for the selected date range ──
    const [{ data: logs }, { data: chatMsgs }] = await Promise.all([
      serviceClient
        .from('message_logs')
        .select('sent_at, created_at, status, read_at')
        .eq('tenant_id', user.id)
        .in('status', ['sent', 'delivered', 'read'])
        .gte('created_at', fromISO)
        .lte('created_at', toISO),
      serviceClient
        .from('chat_messages')
        .select('created_at')
        .eq('tenant_id', user.id)
        .eq('direction', 'outbound')
        .neq('type', 'note')
        .gte('created_at', fromISO)
        .lte('created_at', toISO),
    ]);

    // Build per-day buckets
    const dates = dateRange(fromDate, toDate);
    const buckets: Record<string, { sent: number; read: number }> = {};
    dates.forEach(d => { buckets[d] = { sent: 0, read: 0 }; });

    (logs ?? []).forEach(log => {
      const sentTs = log.sent_at ?? log.created_at;
      if (sentTs) {
        const day = toUTCDate(sentTs);
        if (buckets[day]) buckets[day].sent += 1;
      }
      if (log.read_at) {
        const day = toUTCDate(log.read_at);
        if (buckets[day]) buckets[day].read += 1;
      }
    });

    // Also count outbound inbox messages (not already in message_logs)
    (chatMsgs ?? []).forEach(msg => {
      const day = toUTCDate(msg.created_at);
      if (buckets[day]) buckets[day].sent += 1;
    });

    const chartData = dates.map(d => ({
      date:  fmtLabel(d),
      dateRaw: d,
      sent:  buckets[d].sent,
      read:  buckets[d].read,
    }));

    return NextResponse.json({
      stats: {
        totalSent,
        deliveryRate:    Number(deliveryRate.toFixed(1)),
        totalContacts:   contactsCount  || 0,
        activeTemplates: templatesCount || 0,
        totalRead,
        totalDelivered,
        totalFailed,
      },
      chartData,
      range: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
