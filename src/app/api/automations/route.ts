export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

const TYPES = ['greeting', 'ooo'] as const;

const DEFAULTS: Record<string, object> = {
  greeting: {
    type: 'greeting',
    enabled: false,
    message: 'Hi! 👋 Thanks for reaching out. We\'ll get back to you shortly.',
    ooo_start: 18,
    ooo_end: 9,
    timezone: 'Asia/Kolkata',
  },
  ooo: {
    type: 'ooo',
    enabled: false,
    message: 'We\'re currently outside office hours. We\'ll respond first thing when we\'re back! 🙏',
    ooo_start: 18,
    ooo_end: 9,
    timezone: 'Asia/Kolkata',
  },
};

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// ── GET /api/automations — fetch all automations for tenant ───
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const db = serviceDb();

    const { data, error } = await db
      .from('automations')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Merge with defaults — ensure both types always returned
    const result = TYPES.map(type => {
      const existing = data?.find((r: any) => r.type === type);
      return existing ?? { ...DEFAULTS[type], tenant_id: tenantId, id: null };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/automations — upsert an automation ─────────────
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const body = await req.json();
    const { type, enabled, message, ooo_start, ooo_end, timezone } = body;

    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: 'type must be greeting or ooo' }, { status: 400 });
    }

    const db = serviceDb();
    const { data, error } = await db
      .from('automations')
      .upsert(
        {
          tenant_id: tenantId,
          type,
          enabled: enabled ?? false,
          message: message ?? '',
          ooo_start: ooo_start ?? 18,
          ooo_end: ooo_end ?? 9,
          timezone: timezone ?? 'Asia/Kolkata',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,type' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
