export const dynamic = "force-dynamic";

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
// Helper: look up tenant by WABA ID
// ──────────────────────────────────────────────────────────
async function getTenantByWaba(db: SupabaseClient, wabaId: string): Promise<string | null> {
  const { data } = await db
    .from('wa_connections')
    .select('tenant_id')
    .eq('waba_id', wabaId)
    .single();
  return data?.tenant_id ?? null;
}

// ──────────────────────────────────────────────────────────
// Handler: messages (inbound + delivery status)
// ──────────────────────────────────────────────────────────
async function handleMessages(db: SupabaseClient, value: any) {
  const phoneNumberId: string = value?.metadata?.phone_number_id;

  const { data: conn } = await db
    .from('wa_connections')
    .select('tenant_id')
    .eq('phone_number_id', phoneNumberId)
    .single();

  if (!conn?.tenant_id) {
    console.warn(`No tenant for phone_number_id: ${phoneNumberId}`);
    return;
  }

  const tenantId = conn.tenant_id;

  // Delivery / read status updates
  for (const status of value?.statuses ?? []) {
    // Update chat message status
    await db
      .from('chat_messages')
      .update({ status: status.status })
      .eq('meta_message_id', status.id);

    // Update message_log status
    await db
      .from('message_logs')
      .update({ status: status.status })
      .eq('meta_msg_id', status.id);

    // Increment campaign delivered_count / read_count
    if (status.status === 'delivered' || status.status === 'read') {
      const column = status.status === 'delivered' ? 'delivered_count' : 'read_count';
      const { data: log } = await db
        .from('message_logs')
        .select('campaign_id')
        .eq('meta_msg_id', status.id)
        .single();

      if (log?.campaign_id) {
        const { data: camp } = await db
          .from('campaigns')
          .select('delivered_count, read_count')
          .eq('id', log.campaign_id)
          .single();

        if (camp) {
          const currentVal = column === 'delivered_count' ? camp.delivered_count : camp.read_count;
          await db
            .from('campaigns')
            .update({ [column]: (currentVal ?? 0) + 1 })
            .eq('id', log.campaign_id);
        }
      }
    }
  }

  // Incoming messages
  const contacts: any[] = value?.contacts ?? [];
  const messages: any[] = value?.messages ?? [];

  for (const msg of messages) {
    const senderPhone: string = msg.from;
    const metaMessageId: string = msg.id;
    const contact = contacts.find((c: any) => c.wa_id === senderPhone);
    const contactName: string = contact?.profile?.name || senderPhone;

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

    // Check for duplicate before inserting (partial unique index only covers non-null meta_message_id)
    if (metaMessageId) {
      const { data: existing } = await db
        .from('chat_messages')
        .select('id')
        .eq('meta_message_id', metaMessageId)
        .maybeSingle();
      if (existing) {
        console.log(`Duplicate message skipped: ${metaMessageId}`);
        continue;
      }
    }

    const { error: insertErr } = await db
      .from('chat_messages')
      .insert({
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
      });

    if (insertErr) {
      console.error('chat_messages insert error:', insertErr.message, insertErr.code);
    }
  }
}

// ──────────────────────────────────────────────────────────
// Handler: message_template_status_update
// Updates template approval status in our DB
// Payload: { message_template_id, message_template_name, event, reason? }
// event: APPROVED | REJECTED | PENDING_DELETION | FLAGGED | PAUSED | REINSTATED | DISABLED
// ──────────────────────────────────────────────────────────
async function handleTemplateStatusUpdate(db: SupabaseClient, value: any, wabaId: string) {
  const metaTemplateId = String(value.message_template_id ?? '');
  const templateName: string = value.message_template_name ?? '';
  const event: string = value.event ?? '';
  const reason: string = value.reason ?? '';

  if (!metaTemplateId || !event) return;

  // Map Meta event → our meta_status column values
  const statusMap: Record<string, string> = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING_DELETION: 'PENDING_DELETION',
    FLAGGED: 'FLAGGED',
    PAUSED: 'PAUSED',
    REINSTATED: 'APPROVED',
    DISABLED: 'DISABLED',
  };

  const newStatus = statusMap[event] ?? event;

  const updateData: Record<string, any> = { meta_status: newStatus };
  if (reason) updateData.rejection_reason = reason;

  // Update template row and return id + tenant_id for notification
  const { data: updatedTemplate, error } = await db
    .from('templates')
    .update(updateData)
    .eq('meta_template_id', metaTemplateId)
    .select('id, tenant_id, name')
    .single();

  if (error) {
    console.error('Template status update failed:', error.message);
    return;
  }

  console.log(`Template ${metaTemplateId} → ${newStatus}${reason ? ` (${reason})` : ''}`);

  // ── Create a notification for the tenant ──────────────────
  const tenantId = updatedTemplate?.tenant_id;
  const displayName = updatedTemplate?.name || templateName || metaTemplateId;

  const notifMap: Record<string, { title: string; body: string }> = {
    APPROVED: {
      title: '✅ Template Approved',
      body: `Your template "${displayName}" has been approved by Meta and is ready to use.`,
    },
    REJECTED: {
      title: '❌ Template Rejected',
      body: `Your template "${displayName}" was rejected by Meta.${reason ? ` Reason: ${reason}` : ' Please review and resubmit.'}`,
    },
    FLAGGED: {
      title: '⚠️ Template Flagged',
      body: `Your template "${displayName}" has been flagged by Meta. Review your content.`,
    },
    PAUSED: {
      title: '⏸️ Template Paused',
      body: `Your template "${displayName}" has been paused by Meta due to low quality ratings.`,
    },
    DISABLED: {
      title: '🚫 Template Disabled',
      body: `Your template "${displayName}" has been disabled by Meta.`,
    },
    PENDING_DELETION: {
      title: '🗑️ Template Pending Deletion',
      body: `Your template "${displayName}" is pending deletion.`,
    },
  };

  const notif = notifMap[newStatus] ?? {
    title: '🔄 Template Status Updated',
    body: `Your template "${displayName}" status changed to ${newStatus}.`,
  };

  if (tenantId) {
    const { error: notifErr } = await db.from('notifications').insert({
      tenant_id: tenantId,
      type: 'template_status',
      title: notif.title,
      body: notif.body,
      meta: {
        template_id: updatedTemplate?.id ?? null,
        meta_template_id: metaTemplateId,
        template_name: displayName,
        status: newStatus,
        reason: reason || null,
      },
    });
    if (notifErr) console.error('Notification insert failed:', notifErr.message);
  }
}

// ──────────────────────────────────────────────────────────
// Handler: account_alerts
// Logs critical account alerts so tenants can be notified
// Payload: { alert_severity, alert_type, alert_description, waba_info }
// ──────────────────────────────────────────────────────────
async function handleAccountAlert(db: SupabaseClient, value: any, wabaId: string) {
  const tenantId = await getTenantByWaba(db, wabaId);
  if (!tenantId) return;

  console.warn(`Account alert [${value.alert_severity}] for tenant ${tenantId}: ${value.alert_type} — ${value.alert_description}`);

  // Store in message_logs table for visibility (uses existing table)
  await db.from('message_logs').insert({
    tenant_id: tenantId,
    type: 'account_alert',
    status: value.alert_severity ?? 'WARNING',
    error_message: `[${value.alert_type}] ${value.alert_description ?? ''}`.trim(),
  }).then(({ error }) => {
    if (error) console.error('Failed to log account alert:', error.message);
  });
}

// ──────────────────────────────────────────────────────────
// Handler: phone_number_quality_update
// Updates quality rating on the wa_connections row
// Payload: { display_phone_number, phone_number_id, event, current_limit }
// event: FLAGGED | UNFLAGGED | LIMITED
// ──────────────────────────────────────────────────────────
async function handlePhoneQualityUpdate(db: SupabaseClient, value: any) {
  const phoneNumberId: string = value.phone_number_id ?? '';
  const event: string = value.event ?? '';
  const currentLimit: string = value.current_limit ?? '';

  if (!phoneNumberId) return;

  console.log(`Phone quality update for ${phoneNumberId}: ${event} (limit: ${currentLimit})`);

  await db
    .from('wa_connections')
    .update({ quality_rating: event })
    .eq('phone_number_id', phoneNumberId);
}

// ──────────────────────────────────────────────────────────
// Handler: phone_number_name_update
// Updates business name when Meta approves/rejects display name
// Payload: { display_phone_number, phone_number_id, decision, requested_verified_name }
// decision: APPROVED | REJECTED
// ──────────────────────────────────────────────────────────
async function handlePhoneNameUpdate(db: SupabaseClient, value: any) {
  const phoneNumberId: string = value.phone_number_id ?? '';
  const decision: string = value.decision ?? '';
  const approvedName: string = value.requested_verified_name ?? '';

  if (!phoneNumberId) return;

  console.log(`Phone name update for ${phoneNumberId}: ${decision} → "${approvedName}"`);

  if (decision === 'APPROVED' && approvedName) {
    await db
      .from('wa_connections')
      .update({ business_name: approvedName })
      .eq('phone_number_id', phoneNumberId);
  }
}

// ──────────────────────────────────────────────────────────
// Handler: account_review_update
// Logs when Meta restricts / reinstates the WABA
// Payload: { decision } — decision: APPROVED | REJECTED
// ──────────────────────────────────────────────────────────
async function handleAccountReviewUpdate(db: SupabaseClient, value: any, wabaId: string) {
  const decision: string = value.decision ?? '';
  const tenantId = await getTenantByWaba(db, wabaId);

  console.log(`Account review update for WABA ${wabaId}: ${decision}`);

  if (!tenantId) return;

  // Store in message_logs so the tenant can see it
  await db.from('message_logs').insert({
    tenant_id: tenantId,
    type: 'account_review',
    status: decision,
    error_message: `WABA account review: ${decision}`,
  }).then(({ error }) => {
    if (error) console.error('Failed to log account review:', error.message);
  });
}

// ──────────────────────────────────────────────────────────
// POST — Process incoming WhatsApp events
// ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

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
      const wabaId: string = entry.id ?? '';

      for (const change of entry.changes ?? []) {
        const field: string = change.field;
        const value = change.value;

        try {
          switch (field) {
            case 'messages':
              await handleMessages(db, value);
              break;

            case 'message_template_status_update':
              await handleTemplateStatusUpdate(db, value, wabaId);
              break;

            case 'account_alerts':
              await handleAccountAlert(db, value, wabaId);
              break;

            case 'phone_number_quality_update':
              await handlePhoneQualityUpdate(db, value);
              break;

            case 'phone_number_name_update':
              await handlePhoneNameUpdate(db, value);
              break;

            case 'account_review_update':
              await handleAccountReviewUpdate(db, value, wabaId);
              break;

            default:
              console.log(`Unhandled webhook field: ${field}`);
          }
        } catch (handlerErr: any) {
          // Log per-handler errors but don't fail the whole request
          console.error(`Error in handler for field "${field}":`, handlerErr.message);
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
