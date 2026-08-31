export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';
import { generateWebhookSecret } from '@/lib/outbound-webhook';

async function getAuth() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// GET — fetch current webhook config
export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const { data } = await db()
    .from('tenants')
    .select('webhook_url, webhook_secret')
    .eq('id', tenantId)
    .maybeSingle();

  return NextResponse.json({
    webhook_url: data?.webhook_url || null,
    webhook_secret: data?.webhook_secret || null,
  });
}

// POST — save or regenerate webhook config
export async function POST(req: Request) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  const body = await req.json().catch(() => ({}));

  const update: Record<string, any> = {};

  if ('webhook_url' in body) {
    // validate URL
    if (body.webhook_url) {
      try { new URL(body.webhook_url); } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
    }
    update.webhook_url = body.webhook_url || null;
  }

  if (body.regenerate_secret || !body.webhook_url) {
    // Only auto-generate secret if regenerating or setting URL for first time
    const { data: existing } = await db()
      .from('tenants')
      .select('webhook_secret')
      .eq('id', tenantId)
      .maybeSingle();

    if (body.regenerate_secret || !existing?.webhook_secret) {
      update.webhook_secret = generateWebhookSecret();
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await db()
    .from('tenants')
    .update(update)
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return new values
  const { data } = await db()
    .from('tenants')
    .select('webhook_url, webhook_secret')
    .eq('id', tenantId)
    .maybeSingle();

  return NextResponse.json({
    webhook_url: data?.webhook_url || null,
    webhook_secret: data?.webhook_secret || null,
  });
}

// DELETE — remove webhook config
export async function DELETE() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await getEffectiveTenantId(user.id);
  await db()
    .from('tenants')
    .update({ webhook_url: null, webhook_secret: null })
    .eq('id', tenantId);

  return NextResponse.json({ success: true });
}
