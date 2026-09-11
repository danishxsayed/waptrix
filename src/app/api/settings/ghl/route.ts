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

  // Verify the token works using contacts search (uses contacts.write scope)
  try {
    const verifyRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${ghl_location_id}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${ghl_token}`,
          'Version': '2021-07-28',
        },
      }
    );
    if (!verifyRes.ok) {
      const errText = await verifyRes.text().catch(() => '');
      console.error('[ghl settings] verify failed:', verifyRes.status, errText);
      return NextResponse.json(
        { error: `GHL rejected the token (${verifyRes.status}). Check your token and Location ID are correct.` },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach GoHighLevel API to verify credentials' }, { status: 400 });
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
