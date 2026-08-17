export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function serviceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getEffectiveTenantId(user.id);
    const db = serviceDb();

    // Verify campaign belongs to this tenant first
    const { data: campaign, error: campaignErr } = await db
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or unauthorized' }, { status: 404 });
    }

    // Fetch logs by campaign_id only — tenant security already checked above
    const { data, error } = await db
      .from('message_logs')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('message_logs fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('logs route error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
