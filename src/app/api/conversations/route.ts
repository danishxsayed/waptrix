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
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '50', 10), 100);
    const cursor = searchParams.get('cursor'); // ISO timestamp — load before this
    const search = (searchParams.get('search') || '').trim();

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
