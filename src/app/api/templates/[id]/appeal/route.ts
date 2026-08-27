export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';
import { getEffectiveTenantId } from '@/lib/tenant';

export async function POST(
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

    // Use effective tenant ID so agents/admins can also appeal
    const tenantId = await getEffectiveTenantId(user.id);

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Fetch template
    const { data: template, error: tplErr } = await service
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (tplErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (!template.meta_template_id) {
      return NextResponse.json({ error: 'Template has not been submitted to Meta yet.' }, { status: 400 });
    }

    // Fetch connection
    const { data: conn } = await service
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', tenantId)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected.' }, { status: 400 });
    }

    const token = process.env.META_SYSTEM_TOKEN || conn.access_token;

    // Body may include a user-chosen appeal category; fall back to stored category
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const appealCategory: string = body.category || template.category;

    const VALID = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (!VALID.includes(appealCategory)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID.join(', ')}` }, { status: 400 });
    }

    // POST /{meta_template_id} { category } — appeals Meta's reclassification
    await metaApi.appealCategory(token, template.meta_template_id, appealCategory);

    // Update DB — store the appealed category and mark PENDING
    await service
      .from('templates')
      .update({ meta_status: 'PENDING', category: appealCategory })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    return NextResponse.json({ success: true, appealedCategory: appealCategory });
  } catch (err: any) {
    const metaError = err.response?.data?.error;
    const msg = metaError?.error_user_msg || metaError?.message || err.message || 'Appeal failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
