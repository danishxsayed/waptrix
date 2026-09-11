export const dynamic = 'force-dynamic';

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
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// GET — fetch current GHL config (token masked)
export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const { data } = await db()
    .from('tenants')
    .select('ghl_token, ghl_location_id')
    .eq('id', tenantId)
    .maybeSingle();

  return NextResponse.json({
    ghl_token: data?.ghl_token ? '••••••••' + data.ghl_token.slice(-4) : null,
    ghl_location_id: data?.ghl_location_id || null,
    connected: !!(data?.ghl_token && data?.ghl_location_id),
  });
}

// POST — save GHL token + location ID
export async function POST(req: Request) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const body = await req.json().catch(() => ({}));

  const { ghl_token, ghl_location_id } = body;

  if (!ghl_token || !ghl_location_id) {
    return NextResponse.json({ error: 'Both token and location ID are required' }, { status: 400 });
  }

  const { error } = await db()
    .from('tenants')
    .update({ ghl_token, ghl_location_id })
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, connected: true });
}

// DELETE — remove GHL config
export async function DELETE() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  await db()
    .from('tenants')
    .update({ ghl_token: null, ghl_location_id: null })
    .eq('id', tenantId);

  return NextResponse.json({ success: true });
}
