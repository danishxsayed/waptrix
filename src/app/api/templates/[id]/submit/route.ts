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

    // 2. Fetch tenant's active Meta connections
    const { data: conn, error: connError } = await serviceClient
      .from('wa_connections')
      .select('access_token, waba_id, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (connError || !conn?.access_token) {
      return NextResponse.json({
        error: 'WhatsApp Business Account not connected. Please connect first.'
      }, { status: 400 });
    }

    // Resolve WABA ID — stored value may be 'manual' or 'pending' if auto-detect failed
    const INVALID_WABA = ['manual', 'pending', '', null, undefined];
    let wabaId: string = conn.waba_id;

    if (INVALID_WABA.includes(wabaId) && conn.phone_number_id && conn.phone_number_id !== 'pending') {
      // Look up the real WABA ID from Meta using the phone number ID
      try {
        const lookupToken = process.env.META_SYSTEM_TOKEN || conn.access_token;
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${conn.phone_number_id}?fields=whatsapp_business_account&access_token=${lookupToken}`
        );
        const d = await r.json();
        const resolvedWabaId = d?.whatsapp_business_account?.id;
        if (resolvedWabaId && resolvedWabaId !== conn.phone_number_id) {
          wabaId = resolvedWabaId;
          // Persist so future calls don't need to look it up again
          await serviceClient
            .from('wa_connections')
            .update({ waba_id: wabaId })
            .eq('tenant_id', user.id);
          console.log(`Resolved and saved WABA ID: ${wabaId}`);
        }
      } catch (e) {
        console.warn('WABA ID lookup failed:', e);
      }
    }

    if (INVALID_WABA.includes(wabaId)) {
      return NextResponse.json({
        error: 'Could not resolve your WhatsApp Business Account ID. Please go to the Connect page, click "Subscribe Webhook (fix inbox)" to resolve your WABA ID, then try again.',
      }, { status: 400 });
    }

    // Use META_SYSTEM_TOKEN for template operations when available
    const submitToken = process.env.META_SYSTEM_TOKEN || conn.access_token;

    // 3. Build Meta component payload format
    const metaComponents: any[] = [];

    // Header
    if (template.header_type && template.header_type !== 'NONE') {
      if (template.header_type === 'TEXT') {
        metaComponents.push({
          type: 'HEADER',
          format: 'TEXT',
          text: template.header_text
        });
      } else {
        // IMAGE, VIDEO, DOCUMENT
        metaComponents.push({
          type: 'HEADER',
          format: template.header_type,
          example: {
            header_handle: [
              template.header_text || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809'
            ]
          }
        });
      }
    }

    // Body (with sample values for variables if present)
    const bodyText = template.body || '';
    const bodyMatches = bodyText.match(/{{(\d+)}}/g);
    const bodyExample = bodyMatches && bodyMatches.length > 0
      ? { body_text: [bodyMatches.map(() => 'Sample')] }
      : undefined;

    metaComponents.push({
      type: 'BODY',
      text: bodyText,
      ...(bodyExample ? { example: bodyExample } : {})
    });

    // Footer
    if (template.footer) {
      metaComponents.push({
        type: 'FOOTER',
        text: template.footer
      });
    }

    // Buttons
    if (template.buttons && template.buttons.length > 0) {
      metaComponents.push({
        type: 'BUTTONS',
        buttons: template.buttons.map((btn: any) => {
          if (btn.type === 'QUICK_REPLY') {
            return {
              type: 'QUICK_REPLY',
              text: btn.text
            };
          } else if (btn.type === 'URL') {
            return {
              type: 'URL',
              text: btn.text,
              url: btn.url
            };
          } else {
            // PHONE_NUMBER
            return {
              type: 'PHONE_NUMBER',
              text: btn.text,
              phone_number: btn.phone_number
            };
          }
        })
      });
    }

    // 4. Submit to Meta message_templates API
    const metaRes = await metaApi.submitTemplate(submitToken, wabaId, {
      name: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // normalize name for Meta constraints
      category: template.category || 'MARKETING',
      language: template.language || 'en_US',
      components: metaComponents
    });

    if (!metaRes?.id) {
      return NextResponse.json({ error: 'Failed to obtain template ID from Meta' }, { status: 500 });
    }

    // 5. Update local database
    const { error: dbError } = await serviceClient
      .from('templates')
      .update({
        meta_template_id: metaRes.id,
        meta_status: 'PENDING'
      })
      .eq('id', id)
      .eq('tenant_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, metaTemplateId: metaRes.id });

  } catch (err: any) {
    console.error('Submit template error:', err);
    const errorMsg = err.response?.data?.error?.message || err.message || 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
