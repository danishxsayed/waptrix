export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getEffectiveTenantId } from '@/lib/tenant';

async function getAuthUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

/**
 * GET /api/contacts/tags
 * Returns a sorted array of all unique tag strings used by this tenant's contacts.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const db = serviceDb();

    // Tags are stored in custom2 as a comma-separated string (e.g. "VIP, CLIENT")
    const { data, error } = await db
      .from('contacts')
      .select('custom2')
      .eq('tenant_id', tenantId)
      .not('custom2', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Flatten and deduplicate
    const tagSet = new Set<string>();
    for (const row of data || []) {
      if (row.custom2 && typeof row.custom2 === 'string') {
        row.custom2.split(',').forEach((t: string) => {
          const clean = t.trim();
          if (clean) tagSet.add(clean);
        });
      }
    }

    return NextResponse.json([...tagSet].sort());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
