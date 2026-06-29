export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/start
 *
 * Initiates a brand-new WhatsApp conversation with any phone number.
 *
 * WhatsApp API constraint: the FIRST message to a number that has never
 * messaged you (or whose 24-hour window has closed) MUST be a template
 * message. Free-text will be rejected by Meta with error 131026.
 *
 * Body:
 *   phone         – full E.164 phone number, e.g. "+971501234567"
 *   contactName   – optional display name
 *   templateName  – approved template name
 *   languageCode  – e.g. "en_US" (defaults to "en_US")
 *   components    – template components array (defaults to [])
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const body = await req.json();
    const {
      phone,
      contactName,
      templateName,
      languageCode = 'en_US',
      components = [],
    } = body;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    if (!templateName) return NextResponse.json({ error: 'templateName is required — WhatsApp requires a template to initiate new conversations' }, { status: 400 });

    // Normalize phone: must start with +
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // ── Get WhatsApp connection ───────────────────────────────────────────────
    const { data: waConn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!waConn?.access_token || !waConn?.phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const sendToken = process.env.META_SYSTEM_TOKEN || waConn.access_token;

    // ── Send template via Meta API ────────────────────────────────────────────
    const metaPayload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    let sendRes = await fetch(
      `https://graph.facebook.com/v19.0/${waConn.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      }
    );
    let sendData = await sendRes.json();

    // Retry with tenant token if system token fails (#200 = permissions)
    if (sendData.error && process.env.META_SYSTEM_TOKEN && sendData.error.code === 200) {
      sendRes = await fetch(
        `https://graph.facebook.com/v19.0/${waConn.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waConn.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        }
      );
      sendData = await sendRes.json();
    }

    if (sendData.error) {
      console.error('Meta send error (start conversation):', JSON.stringify(sendData.error));
      return NextResponse.json({
        error: sendData.error.message || 'Failed to send message',
        metaError: sendData.error,
      }, { status: 400 });
    }

    const metaMessageId = sendData.messages?.[0]?.id ?? null;
    const storedContent = `[Template: ${templateName}]`;
    const now = new Date().toISOString();

    // ── Upsert conversation ───────────────────────────────────────────────────
    // If a conversation already exists for this phone+tenant, reuse it.
    // Otherwise create a new one.
    let conversation: any = null;

    const { data: existing } = await db
      .from('conversations')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('contact_phone', normalizedPhone)
      .single();

    if (existing) {
      // Update last_message on the existing conversation
      const { data: updated } = await db
        .from('conversations')
        .update({
          last_message: storedContent,
          last_message_at: now,
          contact_name: contactName || existing.contact_name,
        })
        .eq('id', existing.id)
        .select()
        .single();
      conversation = updated ?? existing;
    } else {
      // Create brand-new conversation
      const { data: created, error: createErr } = await db
        .from('conversations')
        .insert({
          tenant_id: user.id,
          contact_phone: normalizedPhone,
          contact_name: contactName || normalizedPhone,
          last_message: storedContent,
          last_message_at: now,
          unread_count: 0,
          status: 'open',
        })
        .select()
        .single();

      if (createErr) {
        console.error('conversations insert error:', createErr.message);
        return NextResponse.json({ error: 'Failed to create conversation: ' + createErr.message }, { status: 500 });
      }
      conversation = created;
    }

    // ── Save outbound message ─────────────────────────────────────────────────
    const { data: savedMsg } = await db
      .from('chat_messages')
      .insert({
        tenant_id: user.id,
        conversation_id: conversation.id,
        direction: 'outbound',
        meta_message_id: metaMessageId,
        type: 'template',
        content: storedContent,
        status: 'sent',
      })
      .select()
      .single();

    return NextResponse.json({ conversation, message: savedMsg });
  } catch (err: any) {
    console.error('Start conversation error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
