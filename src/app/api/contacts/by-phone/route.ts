export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

/** GET /api/contacts/by-phone?phone=+919XXXXXXXXX
 *  Returns the contact record matching the given phone (with or without + prefix).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';

    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Try both formats: +91XXX and 91XXX (two separate .eq() calls to avoid PostgREST + parsing issues)
    const digits = rawPhone.replace(/\D/g, '');
    const withPlus = `+${digits}`;

    // First try with + prefix
    const { data: dataPlus, error: errPlus } = await db
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', withPlus)
      .maybeSingle();
    if (errPlus) return NextResponse.json({ error: errPlus.message }, { status: 500 });
    if (dataPlus) return NextResponse.json(dataPlus);

    // Fallback: try without + prefix
    const { data: dataRaw, error: errRaw } = await db
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', digits)
      .maybeSingle();
    if (errRaw) return NextResponse.json({ error: errRaw.message }, { status: 500 });
    return NextResponse.json(dataRaw ?? null);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
