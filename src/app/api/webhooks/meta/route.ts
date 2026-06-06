export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// ──────────────────────────────────────────────────────────
// Verify Meta webhook signature
// ──────────────────────────────────────────────────────────
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.META_APP_SECRET) return false;
  const expected = 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}

// ──────────────────────────────────────────────────────────
// GET — Meta webhook verification handshake
// ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('Webhook verified by Meta');
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ──────────────────────────────────────────────────────────
// POST — Process incoming WhatsApp events
// ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature (skip gracefully if secret not yet configured)
    if (process.env.META_APP_SECRET && !verifySignature(rawBody, signature)) {
      console.warn('Webhook signature mismatch — rejecting');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ received: true });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId: string = value?.metadata?.phone_number_id;

        // Find which tenant owns this phone number
        const { data: conn } = await db
          .from('wa_connections')
          .select('tenant_id')
          .eq('phone_number_id', phoneNumberId)
          .single();

        if (!conn?.tenant_id) {
          console.warn(`No tenant found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        const tenantId = conn.tenant_id;

        // Handle delivery/read status updates
        for (const status of value?.statuses ?? []) {
          await db
            .from('chat_messages')
            .update({ status: status.status })
            .eq('meta_message_id', status.id);
        }

        // Handle incoming messages
        const contacts: any[] = value?.contacts ?? [];
        const messages: any[] = value?.messages ?? [];

        for (const msg of messages) {
          const senderPhone: string = msg.from;
          const metaMessageId: string = msg.id;
          const contact = contacts.find((c: any) => c.wa_id === senderPhone);
          const contactName: string = contact?.profile?.name || senderPhone;

          // Parse message content by type
          let type: string = msg.type ?? 'text';
          let content = '';
          let mediaId: string | null = null;
          let mediaMime: string | null = null;

          if (type === 'text') {
            content = msg.text?.body ?? '';
          } else if (['image', 'document', 'audio', 'video', 'sticker'].includes(type)) {
            const mediaObj = msg[type];
            mediaId = mediaObj?.id ?? null;
            mediaMime = mediaObj?.mime_type ?? null;
            content = mediaObj?.caption || mediaObj?.filename || `[${type}]`;
          } else if (type === 'interactive') {
            content = msg.interactive?.button_reply?.title
              || msg.interactive?.list_reply?.title
              || '[interactive]';
          } else {
            content = `[${type} message]`;
          }

          const msgTimestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

          // Upsert conversation (create if new, update last_message if existing)
          const { data: existingConv } = await db
            .from('conversations')
            .select('id, unread_count')
            .eq('tenant_id', tenantId)
            .eq('contact_phone', senderPhone)
            .single();

          let conversationId: string;

          if (existingConv) {
            conversationId = existingConv.id;
            await db
              .from('conversations')
              .update({
                contact_name: contactName,
                last_message: content.slice(0, 120),
                last_message_at: msgTimestamp,
                unread_count: (existingConv.unread_count ?? 0) + 1,
              })
              .eq('id', conversationId);
          } else {
            const { data: newConv } = await db
              .from('conversations')
              .insert({
                tenant_id: tenantId,
                contact_phone: senderPhone,
                contact_name: contactName,
                last_message: content.slice(0, 120),
                last_message_at: msgTimestamp,
                unread_count: 1,
                status: 'open',
              })
              .select('id')
              .single();

            if (!newConv) continue;
            conversationId = newConv.id;
          }

          // Insert message (deduplicate by meta_message_id)
          await db
            .from('chat_messages')
            .upsert({
              tenant_id: tenantId,
              conversation_id: conversationId,
              direction: 'inbound',
              meta_message_id: metaMessageId,
              type,
              content,
              media_id: mediaId,
              media_mime: mediaMime,
              status: 'delivered',
              created_at: msgTimestamp,
            }, {
              onConflict: 'meta_message_id',
              ignoreDuplicates: true,
            });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err.message);
    // Always return 200 to Meta to prevent aggressive retries
    return NextResponse.json({ received: true });
  }
}
