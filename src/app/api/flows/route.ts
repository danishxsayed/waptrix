export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/flows
// Fetches the tenant's WhatsApp Flows from Meta Graph API and enriches
// each with a response_count from our flow_responses table.
export async function GET() {
  const cookieStore = await cookies();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get tenant's WA connection
  const { data: conn } = await db
    .from('wa_connections')
    .select('phone_number_id, access_token')
    .eq('tenant_id', user.id)
    .single();

  if (!conn?.phone_number_id || !conn?.access_token) {
    return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
  }

  const token = process.env.META_SYSTEM_TOKEN || conn.access_token;

  // Fetch flows from Meta Graph API
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/flows?fields=id,name,status,categories,validation_errors,preview,updated_at`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json();
    return NextResponse.json({ error: err?.error?.message || 'Failed to fetch flows from Meta' }, { status: 502 });
  }

  const metaData = await metaRes.json();
  const flows: any[] = metaData.data || [];

  if (flows.length === 0) {
    return NextResponse.json([]);
  }

  // Get response counts per flow from our DB
  const flowIds = flows.map((f: any) => f.id);
  const { data: responseCounts } = await db
    .from('flow_responses')
    .select('flow_id')
    .eq('tenant_id', user.id)
    .in('flow_id', flowIds);

  const countMap: Record<string, number> = {};
  (responseCounts || []).forEach((r: any) => {
    countMap[r.flow_id] = (countMap[r.flow_id] || 0) + 1;
  });

  const enriched = flows.map((f: any) => ({
    id: f.id,
    name: f.name,
    status: f.status,           // DRAFT | PUBLISHED | DEPRECATED | BLOCKED | THROTTLED
    categories: f.categories || [],
    updated_at: f.updated_at,
    preview_url: f.preview?.preview_url || null,
    has_errors: (f.validation_errors || []).length > 0,
    response_count: countMap[f.id] || 0,
  }));

  return NextResponse.json(enriched);
}
