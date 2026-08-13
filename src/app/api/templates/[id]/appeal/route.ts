export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Fetch template
    const { data: template, error: tplErr } = await service
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.id)
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
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected.' }, { status: 400 });
    }

    const token = process.env.META_SYSTEM_TOKEN || conn.access_token;

    // Appeal: POST /{meta_template_id} { category: originalCategory }
    const appealCategory = template.category; // the category the user originally chose
    await metaApi.appealCategory(token, template.meta_template_id, appealCategory);

    // Update DB — mark appeal in progress
    await service
      .from('templates')
      .update({ meta_status: 'PENDING' })
      .eq('id', id)
      .eq('tenant_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const metaError = err.response?.data?.error;
    const msg = metaError?.error_user_msg || metaError?.message || err.message || 'Appeal failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
