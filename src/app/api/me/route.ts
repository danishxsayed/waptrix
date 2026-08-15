export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Check if this user is a staff member
    const { data: memberRow } = await db
      .from('team_members')
      .select('role, owner_tenant_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isStaff = !!memberRow;
    const role: 'owner' | 'admin' | 'agent' = isStaff
      ? (memberRow!.role as 'admin' | 'agent')
      : 'owner';
    const tenantId = isStaff ? memberRow!.owner_tenant_id : user.id;

    // Load the effective tenant's data
    const { data: tenant } = await db
      .from('tenants')
      .select('id, name, plan, messages_used, messages_limit, company, plan_expires_at, trial_ends_at')
      .eq('id', tenantId)
      .single();

    return NextResponse.json(
      { role, tenant: tenant ? { ...tenant, email: user.email } : null, isStaff },
      { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=60' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
