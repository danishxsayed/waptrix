export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

async function getAuth() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// PATCH /api/conversations/[id]/messages/[msgId] — edit note content
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { id, msgId } = await params;
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const db = serviceDb();
    const { data, error } = await db
      .from('chat_messages')
      .update({ content: content.trim() })
      .eq('id', msgId)
      .eq('conversation_id', id)
      .eq('tenant_id', tenantId)
      .eq('type', 'note')
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]/messages/[msgId] — delete note
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { id, msgId } = await params;
    const db = serviceDb();

    const { error } = await db
      .from('chat_messages')
      .delete()
      .eq('id', msgId)
      .eq('conversation_id', id)
      .eq('tenant_id', tenantId)
      .eq('type', 'note');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
