export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';
import { sendEmail } from '@/lib/email/resend';
import { getTemplateStatusEmail } from '@/lib/email/template';

export async function POST(
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

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Fetch template from DB
    const { data: template, error: templateError } = await serviceClient
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.id)
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
    const { data: conn, error: connError } = await serviceClient
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', user.id)
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
    const { error: dbError } = await serviceClient
      .from('templates')
      .update({
        meta_status: metaStatus,
        rejection_reason: rejectionReason
      })
      .eq('id', id)
      .eq('tenant_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 5. Send email notification if status changed to APPROVED or REJECTED
    const previousStatus = template.meta_status;
    if (
      (metaStatus === 'APPROVED' || metaStatus === 'REJECTED') &&
      previousStatus !== metaStatus
    ) {
      try {
        const userEmail = user.email;
        if (userEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
          const dashboardUrl = `${appUrl}/templates`;
          const html = getTemplateStatusEmail(
            template.name,
            metaStatus as 'APPROVED' | 'REJECTED',
            rejectionReason,
            dashboardUrl
          );

          // Override the HTML produced by sendEmail — call Resend directly so we use our custom template
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: 'Waptrix <no-reply@waptrix.in>',
                to: userEmail,
                subject: metaStatus === 'APPROVED'
                  ? `✅ Template "${template.name}" Approved by Meta`
                  : `❌ Template "${template.name}" Rejected by Meta`,
                html,
              }),
            });
          }
        }
      } catch (emailErr) {
        // Non-fatal — log and continue
        console.error('Template status email failed:', emailErr);
      }
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
