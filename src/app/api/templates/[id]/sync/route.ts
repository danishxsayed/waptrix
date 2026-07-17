export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';
import { getTemplateStatusEmail, getCategoryChangeEmail } from '@/lib/email/template';

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

    // 3. Retrieve status from Meta API (includes category)
    const syncToken = process.env.META_SYSTEM_TOKEN || conn.access_token;
    const statusData = await metaApi.getTemplateStatus(syncToken, template.meta_template_id);

    const metaStatus = statusData?.status || 'PENDING';
    const rejectionReason = statusData?.rejected_reason || null;
    const metaCategory: string | null = statusData?.category ?? null;

    // Detect category change
    const categoryChanged = metaCategory && metaCategory !== template.category;

    // 4. Update in local DB (sync status + category if Meta changed it)
    const dbUpdate: Record<string, any> = {
      meta_status: metaStatus,
      rejection_reason: rejectionReason,
    };
    if (metaCategory) dbUpdate.category = metaCategory;

    const { error: dbError } = await serviceClient
      .from('templates')
      .update(dbUpdate)
      .eq('id', id)
      .eq('tenant_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
    const dashboardUrl = `${appUrl}/templates`;
    const userEmail = user.email;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    async function resendEmail(to: string, subject: string, html: string) {
      if (!RESEND_API_KEY || !to) return;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: 'Waptrix <no-reply@waptrix.in>', to, subject, html }),
      });
    }

    // 5. Category change — notify + email if Meta reclassified the template
    if (categoryChanged && metaCategory) {
      const fmt = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
      const prevCat = template.category || 'Unknown';

      try {
        await serviceClient.from('notifications').insert({
          tenant_id: user.id,
          type: 'template_category_change',
          title: '🔄 Template Category Changed by Meta',
          body: `Meta changed "${template.name}" from ${fmt(prevCat)} to ${fmt(metaCategory)}. This may affect messaging charges.`,
          meta: {
            template_id: id,
            template_name: template.name,
            previous_category: prevCat,
            new_category: metaCategory,
          },
        });

        if (userEmail) {
          const html = getCategoryChangeEmail(template.name, prevCat, metaCategory, dashboardUrl);
          await resendEmail(
            userEmail,
            `⚠️ Template "${template.name}" Category Changed: ${fmt(prevCat)} → ${fmt(metaCategory)}`,
            html
          );
        }
      } catch (err) {
        console.error('Category change notification failed:', err);
      }
    }

    // 6. Status change — notify + email for APPROVED / REJECTED
    const previousStatus = template.meta_status;
    if ((metaStatus === 'APPROVED' || metaStatus === 'REJECTED') && previousStatus !== metaStatus) {
      try {
        if (userEmail) {
          const html = getTemplateStatusEmail(
            template.name,
            metaStatus as 'APPROVED' | 'REJECTED',
            rejectionReason,
            dashboardUrl
          );
          await resendEmail(
            userEmail,
            metaStatus === 'APPROVED'
              ? `✅ Template "${template.name}" Approved by Meta`
              : `❌ Template "${template.name}" Rejected by Meta`,
            html
          );
        }
      } catch (emailErr) {
        console.error('Template status email failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      metaStatus,
      rejectionReason,
      categoryChanged: categoryChanged ? { from: template.category, to: metaCategory } : null,
    });

  } catch (err: any) {
    console.error('Sync template error:', err);
    const errorMsg = err.response?.data?.error?.message || err.message || 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
