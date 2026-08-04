export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

async function getUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// GET /api/team-chat — last 100 messages for this tenant
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await db
    .from('team_messages')
    .select('id, sender_id, sender_email, message, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/team-chat — send a message
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: 'Message too long' }, { status: 400 });

  const tenantId = await getEffectiveTenantId(user.id);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await db
    .from('team_messages')
    .insert({
      tenant_id:    tenantId,
      sender_id:    user.id,
      sender_email: user.email ?? 'Unknown',
      message:      message.trim(),
    })
    .select('id, sender_id, sender_email, message, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
