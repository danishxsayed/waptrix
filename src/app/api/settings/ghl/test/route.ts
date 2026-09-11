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

const GHL_BASE = 'https://services.leadconnectorhq.com';

// POST — run a live test: create contact + add note, return step-by-step results
export async function POST() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: tenant } = await db
    .from('tenants')
    .select('ghl_token, ghl_location_id')
    .eq('id', tenantId)
    .maybeSingle();

  const token = tenant?.ghl_token;
  const locationId = tenant?.ghl_location_id;

  if (!token || !locationId) {
    return NextResponse.json({ error: 'GHL not configured' }, { status: 400 });
  }

  const steps: Record<string, any> = {};
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };

  // Step 1: create a test contact
  const contactRes = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      locationId,
      phone: '+10000000001',
      firstName: 'Waptrix',
      lastName: 'Test',
      source: 'WhatsApp via Waptrix',
    }),
  });
  const contactBody = await contactRes.json().catch(() => ({}));
  steps.contact = { status: contactRes.status, ok: contactRes.ok, data: contactBody };

  const contactId = contactBody?.contact?.id;
  if (!contactId) {
    return NextResponse.json({ success: false, steps, error: 'Could not create test contact' });
  }

  // Step 2: add a note
  const noteRes = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: '📲 WhatsApp ⬅️ Received: This is a Waptrix test message' }),
  });
  const noteBody = await noteRes.json().catch(() => ({}));
  steps.note = { status: noteRes.status, ok: noteRes.ok, data: noteBody };

  return NextResponse.json({
    success: contactRes.ok && noteRes.ok,
    steps,
    contactId,
    message: noteRes.ok
      ? `✅ Success! Check contact "Waptrix Test" in GHL → Notes`
      : `❌ Note failed (${noteRes.status}) — check steps for details`,
  });
}
