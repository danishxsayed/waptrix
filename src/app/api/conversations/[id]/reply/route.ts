export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Verify ownership and get contact phone
    const { data: conv } = await db
      .from('conversations')
      .select('id, contact_phone, tenant_id')
      .eq('id', conversationId)
      .eq('tenant_id', user.id)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Get WhatsApp connection for this tenant
    const { data: waConn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!waConn?.access_token || !waConn?.phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const body = await req.json();
    const { type = 'text', content, templateName, languageCode, components, mediaUrl, mediaMimeType } = body;

    const baseUrl = `https://graph.facebook.com/v19.0/${waConn.phone_number_id}/messages`;
    // Use META_SYSTEM_TOKEN if available — it has send permissions on all WABAs connected to this app.
    // Falls back to the tenant's stored token.
    const sendToken = process.env.META_SYSTEM_TOKEN || waConn.access_token;
    const headers = {
      Authorization: `Bearer ${sendToken}`,
      'Content-Type': 'application/json',
    };

    let metaPayload: any;
    let storedType = type;
    let storedContent = content || '';

    if (type === 'text') {
      // ── Free-text message (within 24h customer service window)
      metaPayload = {
        messaging_product: 'whatsapp',
        to: conv.contact_phone,
        type: 'text',
        text: { body: content, preview_url: false },
      };

    } else if (type === 'template') {
      // ── Template message (works outside 24h window)
      metaPayload = {
        messaging_product: 'whatsapp',
        to: conv.contact_phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode || 'en_US' },
          components: components || [],
        },
      };
      storedContent = `[Template: ${templateName}]`;

    } else if (['image', 'document', 'video', 'audio'].includes(type)) {
      // ── Media message — upload file to Meta first if raw URL provided
      let mediaId: string | null = null;

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
            `https://graph.facebook.com/v19.0/${waConn.phone_number_id}/media`,
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
        to: conv.contact_phone,
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
    const { data: savedMsg } = await db
      .from('chat_messages')
      .insert({
        tenant_id: user.id,
        conversation_id: conversationId,
        direction: 'outbound',
        meta_message_id: metaMessageId,
        type: storedType,
        content: storedContent,
        media_id: mediaId ?? null,
        status: 'sent',
      })
      .select()
      .single();

    // Update conversation last_message
    await db
      .from('conversations')
      .update({
        last_message: storedContent.slice(0, 120),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json(savedMsg);
  } catch (err: any) {
    console.error('Reply error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
