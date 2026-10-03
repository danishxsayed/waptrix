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
    // Avoid Supabase FK join (contact_id has no FK constraint) — enrich names manually
    const { data, error } = await db
      .from('message_logs')
      .select('id, campaign_id, contact_id, phone, status, meta_msg_id, sent_at, created_at, replied_at, error, error_message, error_detail, tenant_id')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('message_logs fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];

    // Enrich with contact names via a separate query (avoids FK join requirement)
    if (rows.length > 0) {
      const contactIds = [...new Set(rows.map((r: any) => r.contact_id).filter(Boolean))];
      if (contactIds.length > 0) {
        const { data: contacts } = await db
          .from('contacts')
          .select('id, name')
          .in('id', contactIds);
        if (contacts) {
          const nameMap = new Map(contacts.map((c: any) => [c.id, c.name]));
          rows.forEach((r: any) => {
            r.contact = r.contact_id ? { name: nameMap.get(r.contact_id) || null } : null;
          });
        }
      }
    }

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('logs route error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
