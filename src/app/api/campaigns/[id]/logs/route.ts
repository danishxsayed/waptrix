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

    // Fetch logs directly — filter by campaign_id + tenant_id for security
    const { data, error } = await db
      .from('message_logs')
      .select('*')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId)
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
