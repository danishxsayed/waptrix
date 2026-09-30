export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEffectiveTenantId } from '@/lib/tenant';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    if (!tenantId) return NextResponse.json({ error: 'Workspace not found' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Fast path: message_logs already tracks replied_at when the webhook fires.
    // A single indexed query is all we need — no JS loops, no chunked fetches.
    const { data: repliedLogs, error } = await db
      .from('message_logs')
      .select('phone')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId)
      .not('replied_at', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!repliedLogs || repliedLogs.length === 0) {
      return NextResponse.json({ reply_count: 0, replied_phones: [] });
    }

    // Deduplicate — a contact could have multiple logs if re-sent
    const repliedPhones = [...new Set(repliedLogs.map((l) => l.phone))];

    return NextResponse.json({
      reply_count: repliedPhones.length,
      replied_phones: repliedPhones,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
