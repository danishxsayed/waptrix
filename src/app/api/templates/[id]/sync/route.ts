export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch template from DB
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', session.user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!template.meta_template_id) {
      return NextResponse.json({ 
        error: 'Template has not been submitted to Meta yet.' 
      }, { status: 400 });
    }

    // 2. Fetch tenant's active Meta connections
    const { data: conn, error: connError } = await supabase
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', session.user.id)
      .single();

    if (connError || !conn?.access_token) {
      return NextResponse.json({ 
        error: 'WhatsApp Business Account credentials not found.' 
      }, { status: 400 });
    }

    // 3. Retrieve status from Meta API
    const statusData = await metaApi.getTemplateStatus(conn.access_token, template.meta_template_id);
    
    const metaStatus = statusData?.status || 'PENDING';
    const rejectionReason = statusData?.rejected_reason || null;

    // 4. Update in local DB
    const { error: dbError } = await supabase
      .from('templates')
      .update({
        meta_status: metaStatus,
        rejection_reason: rejectionReason
      })
      .eq('id', id)
      .eq('tenant_id', session.user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      metaStatus, 
      rejectionReason 
    });

  } catch (err: any) {
    console.error('Sync template error:', err);
    const errorMsg = err.response?.data?.error?.message || err.message || 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
