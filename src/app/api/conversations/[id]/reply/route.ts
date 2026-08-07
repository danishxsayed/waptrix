export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Verify conversation belongs to this tenant (or their owner's tenant)
    const { data: conv } = await db
      .from('conversations')
      .select('id, contact_phone, tenant_id')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Get WhatsApp connection for the effective tenant
    const { data: waConn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', tenantId)
      .single();

    const phoneNumberId = waConn?.phone_number_id && waConn.phone_number_id !== 'pending'
      ? waConn.phone_number_id : null;

    if (!waConn?.access_token || !phoneNumberId) {
      return NextResponse.json({
        error: 'WhatsApp phone number not configured. Go to Settings → Connect and click "Sync Connection" to resolve.'
      }, { status: 400 });
    }

    const body = await req.json();
    const { type = 'text', content, templateName, languageCode, components, mediaUrl, mediaMimeType } = body;

    const baseUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const sendToken = process.env.META_SYSTEM_TOKEN || waConn.access_token;
    const headers = {
      Authorization: `Bearer ${sendToken}`,
      'Content-Type': 'application/json',
    };

    let metaPayload: any;
    let storedType = type;
    let storedContent = content || '';
    let mediaId: string | null = null; // declared at function scope so it's always accessible

    // Meta API requires digits-only (no + prefix)
    const metaPhone = (conv.contact_phone || '').replace(/\D/g, '');

    if (type === 'text') {
      // ── Free-text message (within 24h customer service window)
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                metaPhone,
        type:              'text',
        text:              { body: content, preview_url: false },
      };

    } else if (type === 'template') {
      // ── Template message (works outside 24h window)
      // Normalize name to match how it was submitted to Meta (lowercase + underscores)
      const normalizedTemplateName = (templateName || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const tmplBody: Record<string, any> = {
        name:     normalizedTemplateName,
        language: { code: languageCode || 'en_US' },
      };
      if (components && components.length > 0) {
        tmplBody.components = components;
      }
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                metaPhone,
        type:              'template',
        template:          tmplBody,
      };
      // Look up the actual template body for a meaningful conversation preview
      try {
        const { data: tmpl } = await db.from('templates').select('body').eq('tenant_id', tenantId).ilike('name', normalizedTemplateName).maybeSingle();
        storedContent = tmpl?.body ? tmpl.body.slice(0, 120) : `[Template: ${normalizedTemplateName}]`;
      } catch (_) {
        storedContent = `[Template: ${normalizedTemplateName}]`;
      }

    } else if (['image', 'document', 'video', 'audio'].includes(type)) {
      // ── Media message — upload file to Meta first if raw URL provided

      if (mediaUrl) {
        // mediaUrl is a base64 data URL — convert to binary bytes for upload
        const base64Match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const binaryData = Buffer.from(base64Match[2], 'base64');
          const blob = new Blob([binaryData], { type: mimeType });

          const fd = new FormData();
          fd.append('messaging_product', 'whatsapp');
          fd.append('file', blob, 'upload');

          const uploadRes = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/media`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${sendToken}` },
              body: fd,
            }
          );
          const uploadData = await uploadRes.json();
          console.log('Media upload result:', JSON.stringify(uploadData).substring(0, 200));
          mediaId = uploadData?.id ?? null;
          if (!mediaId) {
            return NextResponse.json({ error: uploadData?.error?.message || 'Media upload failed' }, { status: 400 });
          }
        }
      }

      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                metaPhone,
        type,
        [type]: mediaId ? { id: mediaId } : { link: mediaUrl },
      };

      storedContent = `[${type}]`;
    } else {
      return NextResponse.json({ error: `Unsupported message type: ${type}` }, { status: 400 });
    }

    // Send via Meta API — try system token first, fall back to tenant token
    let sendRes = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(metaPayload),
    });
    let sendData = await sendRes.json();

    // If system token failed with permissions error, retry with tenant's own token
    if (sendData.error && process.env.META_SYSTEM_TOKEN && sendData.error.code === 200) {
      console.warn('System token send failed (#200), retrying with tenant token');
      sendRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${waConn.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(metaPayload),
      });
      sendData = await sendRes.json();
    }

    if (sendData.error) {
      console.error('Meta send error:', JSON.stringify(sendData.error));
      return NextResponse.json({
        error: sendData.error.message || 'Failed to send message',
        metaError: sendData.error,
      }, { status: 400 });
    }

    const metaMessageId = sendData.messages?.[0]?.id ?? null;

    // Save outbound message to DB
    const insertPayload: Record<string, any> = {
      tenant_id: tenantId,
      conversation_id: conversationId,
      direction: 'outbound',
      meta_message_id: metaMessageId,
      type: storedType,
      content: storedContent,
      status: 'sent',
    };
    // Only include media_id if we have one (column may not exist in older schemas)
    if (mediaId) insertPayload.media_id = mediaId;

    const { data: savedMsg, error: insertErr } = await db
      .from('chat_messages')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      // If media_id column doesn't exist, retry without it
      if (insertErr.message?.includes('media_id') || insertErr.code === '42703') {
        delete insertPayload.media_id;
        const { data: retryMsg } = await db
          .from('chat_messages')
          .insert(insertPayload)
          .select()
          .single();

        await db.from('conversations').update({
          last_message: storedContent.slice(0, 120),
          last_message_at: new Date().toISOString(),
        }).eq('id', conversationId);

        // Attach mediaId manually so frontend can display the media
        return NextResponse.json({ ...(retryMsg ?? insertPayload), media_id: mediaId ?? null });
      }
      console.error('chat_messages insert error:', insertErr.message);
    }

    // Update conversation last_message
    await db
      .from('conversations')
      .update({
        last_message: storedContent.slice(0, 120),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json({ ...(savedMsg ?? insertPayload), media_id: mediaId ?? null });
  } catch (err: any) {
    console.error('Reply error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
