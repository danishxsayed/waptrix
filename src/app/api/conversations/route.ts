export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

async function getAuthUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const db = serviceDb();
    await db.from('chat_messages').delete().in('conversation_id', ids).eq('tenant_id', tenantId);
    const { error } = await db.from('conversations').delete().in('id', ids).eq('tenant_id', tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/conversations
 *
 * Supports cursor-based pagination for scalable infinite scroll.
 *
 * Query params:
 *   limit  – page size (default 50, max 100)
 *   cursor – ISO timestamp of the last conversation's last_message_at from
 *            the previous page; omit for the first page
 *   search – filter by contact_name or contact_phone (server-side)
 *
 * Response:
 *   { conversations: [...], hasMore: boolean, nextCursor: string | null }
 *
 * The "hasMore" flag tells the client whether another page exists.
 * Pass nextCursor as ?cursor= in the next request to load it.
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const db = serviceDb();

    const { searchParams } = new URL(req.url);
    const limit             = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const cursor            = searchParams.get('cursor'); // ISO timestamp — load before this
    const search            = (searchParams.get('search') || '').trim();
    const campaignRepliedTo = searchParams.get('campaign_replied_to'); // campaign ID

    // ── Fast path: campaign replied filter ────────────────────────────────────
    // When this param is set we skip pagination entirely and return only the
    // conversations whose contact replied to the given campaign.
    // We look up replied phones from message_logs.replied_at (single indexed
    // query) then fetch only those conversations — no client-side filtering needed.
    if (campaignRepliedTo) {
      // 1. Get replied phones for this campaign (fast — uses partial index)
      const { data: repliedLogs, error: logsErr } = await db
        .from('message_logs')
        .select('phone')
        .eq('campaign_id', campaignRepliedTo)
        .eq('tenant_id', tenantId)
        .not('replied_at', 'is', null);

      if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 });

      const repliedPhones = [...new Set((repliedLogs || []).map((l: any) => l.phone as string))];

      if (repliedPhones.length === 0) {
        return NextResponse.json({ conversations: [], hasMore: false, nextCursor: null });
      }

      // 2. Fetch conversations for those phones — Supabase supports .in() up to ~1000 values
      //    For larger sets we chunk, but replied contacts are typically a small fraction
      const CHUNK = 200;
      const allConvs: any[] = [];
      for (let i = 0; i < repliedPhones.length; i += CHUNK) {
        const chunk = repliedPhones.slice(i, i + CHUNK);
        const { data: convChunk } = await db
          .from('conversations')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('contact_phone', chunk)
          .order('last_message_at', { ascending: false });
        allConvs.push(...(convChunk || []));
      }

      // Sort combined result by last_message_at desc
      allConvs.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      return NextResponse.json({ conversations: allConvs, hasMore: false, nextCursor: null });
    }

    // ── Normal paginated path ─────────────────────────────────────────────────
    // Build query — fetch limit+1 so we can detect whether a next page exists
    let query = db
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })
      .limit(limit + 1);

    // Cursor: conversations older than the last one on the previous page
    if (cursor) {
      query = query.lt('last_message_at', cursor);
    }

    // Server-side search across name and phone
    if (search) {
      query = query.or(
        `contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const conversations = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? conversations[conversations.length - 1].last_message_at
      : null;

    return NextResponse.json({ conversations, hasMore, nextCursor });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
