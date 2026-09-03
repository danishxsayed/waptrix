export const dynamic = "force-dynamic";

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCategoryChangeEmail, getTemplateStatusEmail } from '@/lib/email/template';
import { fireWebhook } from '@/lib/outbound-webhook';

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
// Opt-out / opt-in keywords (whole-message match, case-insensitive)
// NOTE: "yes" is intentionally excluded — it's a common campaign reply keyword
// and must be handled by campaign auto-reply rules, not subscription management.
// ──────────────────────────────────────────────────────────
const OPT_OUT_KEYWORDS = new Set([
  'stop', 'unsubscribe', 'optout', 'opt out', 'opt-out',
  'cancel', 'end', 'quit', 'remove me',
]);
const OPT_IN_KEYWORDS = new Set([
  'start', 'subscribe', 'optin', 'opt in', 'opt-in',
]);

function isOptOut(text: string) {
  return OPT_OUT_KEYWORDS.has(text.trim().toLowerCase());
}
function isOptIn(text: string) {
  return OPT_IN_KEYWORDS.has(text.trim().toLowerCase());
}

// ──────────────────────────────────────────────────────────
// Extract the matchable text for automation rules.
// For button/interactive types, combines title + payload so
// campaign rules can match either field.
// ──────────────────────────────────────────────────────────
function extractMatchText(msg: any, type: string, content: string): string {
  if (type === 'button') {
    const parts = [msg.button?.text, msg.button?.payload].filter(Boolean);
    return parts.join(' ').trim() || content;
  }
  if (type === 'interactive') {
    const parts = [
      msg.interactive?.button_reply?.title,
      msg.interactive?.button_reply?.id,
      msg.interactive?.list_reply?.title,
      msg.interactive?.list_reply?.id,
    ].filter(Boolean);
    return parts.join(' ').trim() || content;
  }
  return content;
}

// Mark a contact opted-out (or back in) by phone number
async function handleOptOut(
  db: SupabaseClient,
  tenantId: string,
  phone: string,
  optOut: boolean,
) {
  const normalizedPhone = phone.replace(/^\+/, '');
  await db.from('contacts').update({
    opted_in:     !optOut,                                          // false = opted out
    opted_out_at: optOut ? new Date().toISOString() : null,
  }).eq('tenant_id', tenantId)
    .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`);
}

// ──────────────────────────────────────────────────────────
// Automation: send an auto-reply via Meta API
// ──────────────────────────────────────────────────────────
async function sendAutoReply(
  db: SupabaseClient,
  tenantId: string,
  toPhone: string,
  message: string
) {
  try {
    const { data: waConn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', tenantId)
      .single();

    if (!waConn?.phone_number_id || !waConn.access_token) return;

    const sendToken = process.env.META_SYSTEM_TOKEN || waConn.access_token;
    const sendRes = await fetch(`https://graph.facebook.com/v19.0/${waConn.phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: message, preview_url: false },
      }),
    });

    const sendData = await sendRes.json();
    const metaMsgId = sendData?.messages?.[0]?.id ?? null;
    const now = new Date().toISOString();

    // Find the conversation so we can save the message and update last_message
    // Match both "+919..." and "919..." since conversations may be stored with or without +
    const phoneWithPlus = toPhone.startsWith('+') ? toPhone : `+${toPhone}`;
    const phoneNoPlus = toPhone.startsWith('+') ? toPhone.slice(1) : toPhone;
    const { data: conv } = await db
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .or(`contact_phone.eq.${phoneWithPlus},contact_phone.eq.${phoneNoPlus}`)
      .maybeSingle();

    if (conv?.id) {
      // Save outbound auto-reply to chat_messages so it appears in the inbox
      await db.from('chat_messages').insert({
        tenant_id:       tenantId,
        conversation_id: conv.id,
        direction:       'outbound',
        meta_message_id: metaMsgId,
        type:            'text',
        content:         message,
        status:          'sent',
        created_at:      now,
      });

      // Update conversation preview
      await db.from('conversations').update({
        last_message:    message.slice(0, 120),
        last_message_at: now,
      }).eq('id', conv.id);
    }
  } catch (err: any) {
    console.error('Auto-reply send failed:', err.message);
  }
}

/**
 * Priority 1 — Campaign auto-reply.
 * Called BEFORE opt-in/opt-out and keyword automations.
 * Returns true if a campaign rule matched (so callers can skip lower-priority handlers).
 *
 * matchText is the combined text + payload for button/interactive messages,
 * or plain message text for text messages.
 */
async function maybeFireCampaignAutoReply(
  db: SupabaseClient,
  tenantId: string,
  senderPhone: string,
  matchText: string
): Promise<boolean> {
  try {
    if (!matchText.trim()) return false;

    // Normalise phone — message_logs stores without leading +
    const phoneNorm = senderPhone.replace(/^\+/, '');

    // Find the most recent campaign message sent to this phone in last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logRow } = await db
      .from('message_logs')
      .select('campaign_id')
      .eq('tenant_id', tenantId)
      .or(`phone.eq.${phoneNorm},phone.eq.+${phoneNorm}`)
      .not('campaign_id', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!logRow?.campaign_id) return false;

    // Fetch campaign auto_replies config
    const { data: campaign } = await db
      .from('campaigns')
      .select('id, auto_replies')
      .eq('id', logRow.campaign_id)
      .maybeSingle();

    if (!campaign?.auto_replies?.enabled) return false;
    const rules: { keywords: string[]; response: string }[] = campaign.auto_replies.rules || [];
    if (rules.length === 0) return false;

    // Match against the combined text (covers button title AND payload)
    const textLower = matchText.toLowerCase().trim();

    for (const rule of rules) {
      if (!rule.keywords?.length || !rule.response) continue;
      const matched = rule.keywords.some((kw: string) => {
        const kwl = kw.trim().toLowerCase();
        return kwl && textLower.includes(kwl);
      });
      if (matched) {
        await sendAutoReply(db, tenantId, senderPhone, rule.response);
        console.log(`[automation] Campaign rule matched for "${matchText}" → campaign ${campaign.id}`);
        return true; // matched — callers skip lower-priority handlers
      }
    }

    return false; // campaign found but no rule matched
  } catch (err: any) {
    console.error('Campaign auto-reply check failed:', err.message);
    return false;
  }
}

/**
 * Check and fire applicable automations (greeting / OOO) for an inbound message.
 * - greeting fires on the FIRST ever message from a contact (new conversation)
 * - ooo fires when current server time is within the configured OOO window
 *   and at most once per 12h per contact (to avoid spam)
 */
async function maybeFireAutomations(
  db: SupabaseClient,
  tenantId: string,
  toPhone: string,
  isNewConversation: boolean,
  messageText?: string,
  skipKeywords = false  // true when campaign auto-reply already handled this message
) {
  try {
    const { data: automations } = await db
      .from('automations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('enabled', true);

    if (!automations || automations.length === 0) return;

    for (const auto of automations) {
      if (auto.type === 'greeting' && isNewConversation && auto.message) {
        await sendAutoReply(db, tenantId, toPhone, auto.message);

      } else if (auto.type === 'ooo' && auto.message) {
        // Check if current time is within OOO window
        const tz = auto.timezone || 'Asia/Kolkata';
        const now = new Date();
        const localHour = parseInt(
          now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
        );

        const start = auto.ooo_start ?? 18;
        const end   = auto.ooo_end   ?? 9;

        // OOO window can wrap midnight (e.g. 18→9 means 6pm to 9am)
        const isOoo = start > end
          ? (localHour >= start || localHour < end)   // wraps midnight
          : (localHour >= start && localHour < end);  // same day

        if (!isOoo) continue;

        // Throttle: don't send OOO to same contact more than once per 12h
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data: recentOoo } = await db
          .from('chat_messages')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('direction', 'outbound')
          .ilike('content', '%office hours%')
          .gte('created_at', twelveHoursAgo)
          .limit(1);

        if (recentOoo && recentOoo.length > 0) continue; // already sent recently

        await sendAutoReply(db, tenantId, toPhone, auto.message);

      } else if (auto.type === 'keyword_rules' && messageText && auto.message && !skipKeywords) {
        // Parse the JSON rules array and match against messageText
        try {
          const rules: { id: string; keywords: string[]; response: string }[] = JSON.parse(auto.message);
          const textLower = messageText.toLowerCase().trim();
          for (const rule of rules) {
            if (!rule.keywords?.length || !rule.response) continue;
            const matched = rule.keywords.some(kw =>
              kw.trim() && textLower.includes(kw.trim().toLowerCase())
            );
            if (matched) {
              await sendAutoReply(db, tenantId, toPhone, rule.response);
              break; // first match wins
            }
          }
        } catch {
          // message field is not valid JSON — skip
        }
      }
    }
  } catch (err: any) {
    console.error('Automation check failed:', err.message);
  }
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

    // Update message_log status (and read_at timestamp when read)
    const logUpdate: Record<string, any> = { status: status.status };
    if (status.status === 'read' && status.timestamp) {
      logUpdate.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    }
    // Capture Meta's error details when a message delivery fails
    // Meta sends: status.errors = [{ code, title, message, error_data, href }]
    if (status.status === 'failed' && Array.isArray(status.errors) && status.errors.length > 0) {
      const e = status.errors[0];
      const parts: string[] = [];
      if (e.code)    parts.push(`code=${e.code}`);
      if (e.title)   parts.push(e.title);
      if (e.message && e.message !== e.title) parts.push(e.message);
      logUpdate.error = parts.join(' | ') || 'Unknown delivery failure';
      console.error(`[webhook] Message ${status.id} delivery failed: ${logUpdate.error}`);

      // Error 131026 = recipient is not a WhatsApp user
      // Auto-mark that contact as opted_out and flag as not on WhatsApp
      if (e.code === 131026 && status.recipient_id) {
        const recipientPhone = status.recipient_id.startsWith('+') ? status.recipient_id : `+${status.recipient_id}`;
        const digitsOnly = status.recipient_id.replace(/\D/g, '');
        try {
          await db
            .from('contacts')
            .update({ opted_in: false, custom4: 'not_on_whatsapp' })
            .eq('tenant_id', tenantId)
            .or(`phone.eq.${recipientPhone},phone.eq.${digitsOnly}`);
          // Also update the conversation to reflect this
          await db
            .from('conversations')
            .update({ status: 'inactive' })
            .eq('tenant_id', tenantId)
            .or(`contact_phone.eq.${recipientPhone},contact_phone.eq.${digitsOnly}`);
          console.log(`[webhook] Marked ${recipientPhone} as not on WhatsApp (error 131026)`);
        } catch (markErr: any) {
          console.error('[webhook] Failed to mark contact as not on WhatsApp:', markErr.message);
        }
      }
    }
    await db
      .from('message_logs')
      .update(logUpdate)
      .eq('meta_msg_id', status.id);

    // Fire CRM webhook for status changes
    if (s === 'delivered' || s === 'read' || s === 'failed') {
      fireWebhook(tenantId, {
        event: 'message.status',
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        message: { id: status.id, type: 'status', content: s, direction: 'outbound', status: s },
      });
    }

    // Increment campaign counters based on delivery status
    const s = status.status;
    if (s === 'delivered' || s === 'read' || s === 'failed') {
      const { data: log } = await db
        .from('message_logs')
        .select('campaign_id')
        .eq('meta_msg_id', status.id)
        .single();

      if (log?.campaign_id) {
        const { data: camp } = await db
          .from('campaigns')
          .select('delivered_count, read_count, failed_count, sent_count')
          .eq('id', log.campaign_id)
          .single();

        if (camp) {
          const updates: Record<string, number> = {};
          if (s === 'delivered') {
            updates.delivered_count = (camp.delivered_count ?? 0) + 1;
          } else if (s === 'read') {
            updates.read_count = (camp.read_count ?? 0) + 1;
          } else if (s === 'failed') {
            updates.failed_count  = (camp.failed_count  ?? 0) + 1;
            // A message that Meta marks failed was previously counted as sent — correct it
            updates.sent_count = Math.max((camp.sent_count ?? 1) - 1, 0);
          }
          await db.from('campaigns').update(updates).eq('id', log.campaign_id);
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
    const repliedToId: string | null = msg.context?.id ?? null;

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
    } else if (type === 'button') {
      // Quick reply button tap (from a template message)
      content = msg.button?.text || msg.button?.payload || '[button reply]';
    } else if (type === 'order') {
      content = '[order]';
    } else if (type === 'reaction') {
      content = msg.reaction?.emoji ? `Reacted ${msg.reaction.emoji}` : '[reaction]';
    } else {
      content = `[${type}]`;
    }

    const msgTimestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

    // ── Extract matchable text (covers button title + payload for template button clicks) ──
    const matchText = extractMatchText(msg, type, content);

    // Meta sends phone without + (e.g. "919970939342") but some conversations
    // are stored with + prefix (created via outbound start route). Match both.
    const { data: existingConv } = await db
      .from('conversations')
      .select('id, unread_count')
      .eq('tenant_id', tenantId)
      .or(`contact_phone.eq.${senderPhone},contact_phone.eq.+${senderPhone}`)
      .maybeSingle();

    let conversationId: string;
    let isNewConversation = false;

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
          contact_phone: '+' + senderPhone,
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
      isNewConversation = true;
    }

    // Upsert contact record so the inbox contact panel always has a row to work with
    try {
      const phoneWithPlus = '+' + senderPhone;
      // Use separate .eq() calls to avoid PostgREST + sign parsing issues in .or()
      let existingContact: { id: string } | null = null;
      const { data: c1 } = await db.from('contacts').select('id').eq('tenant_id', tenantId).eq('phone', phoneWithPlus).maybeSingle();
      if (c1) { existingContact = c1; }
      else {
        const { data: c2 } = await db.from('contacts').select('id').eq('tenant_id', tenantId).eq('phone', senderPhone).maybeSingle();
        if (c2) existingContact = c2;
      }
      if (!existingContact) {
        await db.from('contacts').insert({
          tenant_id: tenantId,
          name: contactName || phoneWithPlus,
          phone: phoneWithPlus,
          opted_in: true,
        });
      } else if (contactName && existingContact.id) {
        await db.from('contacts').update({ name: contactName }).eq('id', existingContact.id);
      }
    } catch (contactErr: any) {
      console.error('[webhook] Failed to upsert contact:', contactErr.message);
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
        replied_to_message_id: repliedToId,
      });

    if (insertErr) {
      console.error('chat_messages insert error:', insertErr.message, insertErr.code);
    }

    // Fire CRM outbound webhook (fire-and-forget — never block the main flow)
    fireWebhook(tenantId, {
      event: isNewConversation ? 'conversation.created' : 'message.received',
      timestamp: msgTimestamp,
      tenant_id: tenantId,
      contact: { phone: '+' + senderPhone, name: contactName },
      conversation_id: conversationId,
      message: { id: metaMessageId, type, content, direction: 'inbound', timestamp: msgTimestamp },
    });

    // ── Automation priority routing ────────────────────────────────────────────
    //
    // Priority 1: Campaign auto-reply (checked first for text, button, interactive).
    //   Button clicks from template quick-replies arrive as type='button' or 'interactive'.
    //   matchText includes both button title and payload for broad matching.
    //
    // Priority 2: Keyword automations — only if campaign didn't handle the message.
    //   Greeting (new conversation) and OOO automations always fire regardless.
    //
    // Priority 3: Opt-in/opt-out system keywords — only for plain text messages
    //   and only if no campaign rule matched. "yes" is NOT an opt-in keyword.
    // ─────────────────────────────────────────────────────────────────────────

    const isActionableType = ['text', 'button', 'interactive'].includes(type);
    let campaignHandled = false;

    if (isActionableType && matchText) {
      campaignHandled = await maybeFireCampaignAutoReply(db, tenantId, senderPhone, matchText);
    }

    if (!campaignHandled && type === 'text') {
      // Priority 3: opt-in / opt-out (only plain text, only if campaign didn't fire)
      if (isOptOut(content)) {
        await handleOptOut(db, tenantId, senderPhone, true);
        fireWebhook(tenantId, {
          event: 'contact.opted_out',
          timestamp: new Date().toISOString(),
          tenant_id: tenantId,
          contact: { phone: '+' + senderPhone, name: contactName },
        });
        await sendAutoReply(
          db, tenantId, senderPhone,
          "You've been unsubscribed and won't receive further messages from us. " +
          "Reply START anytime to opt back in."
        );
      } else if (isOptIn(content)) {
        await handleOptOut(db, tenantId, senderPhone, false);
        await sendAutoReply(
          db, tenantId, senderPhone,
          "You've been re-subscribed! You'll now receive messages from us again. " +
          "Reply STOP at any time to unsubscribe."
        );
      }
    }

    // Greeting (new conversation) and OOO automations always fire.
    // Keyword automations are skipped when campaign already handled the message.
    await maybeFireAutomations(
      db, tenantId, senderPhone, isNewConversation,
      type === 'text' ? content : matchText,
      campaignHandled  // skipKeywords = true if campaign matched
    );
  }
}

// ──────────────────────────────────────────────────────────
// Handler: message_template_status_update
// Updates template approval status in our DB
// Payload: { message_template_id, message_template_name, event, reason? }
// event: APPROVED | REJECTED | PENDING_DELETION | FLAGGED | PAUSED | REINSTATED | DISABLED
// ──────────────────────────────────────────────────────────
async function sendWebhookEmail(tenantId: string, db: SupabaseClient, html: string, subject: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    // Get user email from Supabase Auth
    const { data: userData } = await db.auth.admin.getUserById(tenantId);
    const userEmail = userData?.user?.email;
    if (!userEmail) return;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ from: 'Waptrix <no-reply@waptrix.in>', to: userEmail, subject, html }),
    });
  } catch (err) {
    console.error('Webhook email send failed:', err);
  }
}

async function handleTemplateStatusUpdate(db: SupabaseClient, value: any, wabaId: string) {
  const metaTemplateId = String(value.message_template_id ?? '');
  const templateName: string = value.message_template_name ?? '';
  const event: string = value.event ?? '';
  const reason: string = value.reason ?? '';
  // Category change fields — present when Meta reclassifies the template
  const newCategory: string | null    = value.new_category ?? null;
  const previousCategory: string | null = value.previous_category ?? null;

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
  // If Meta changed the category, update it in our DB immediately
  if (newCategory) updateData.category = newCategory;

  // Update template row and return id + tenant_id + previous category for comparison
  const { data: updatedTemplate, error } = await db
    .from('templates')
    .update(updateData)
    .eq('meta_template_id', metaTemplateId)
    .select('id, tenant_id, name, category')
    .single();

  if (error) {
    console.error('Template status update failed:', error.message);
    return;
  }

  console.log(`Template ${metaTemplateId} → ${newStatus}${reason ? ` (${reason})` : ''}${newCategory ? ` | category: ${previousCategory} → ${newCategory}` : ''}`);

  const tenantId = updatedTemplate?.tenant_id;
  const displayName = updatedTemplate?.name || templateName || metaTemplateId;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
  const dashboardUrl = `${appUrl}/templates`;

  // ── Category change notification + email ──────────────────
  if (newCategory && previousCategory && newCategory !== previousCategory && tenantId) {
    const fmt = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

    // In-app notification
    await db.from('notifications').insert({
      tenant_id: tenantId,
      type: 'template_category_change',
      title: '🔄 Template Category Changed by Meta',
      body: `Meta changed "${displayName}" from ${fmt(previousCategory)} to ${fmt(newCategory)}. This may affect messaging charges.`,
      meta: {
        template_id: updatedTemplate?.id ?? null,
        meta_template_id: metaTemplateId,
        template_name: displayName,
        previous_category: previousCategory,
        new_category: newCategory,
        status: newStatus,
      },
    }).then(({ error: e }) => { if (e) console.error('Category notif failed:', e.message); });

    // Email
    const html = getCategoryChangeEmail(displayName, previousCategory, newCategory, dashboardUrl);
    await sendWebhookEmail(
      tenantId, db, html,
      `⚠️ Template "${displayName}" Category Changed: ${fmt(previousCategory)} → ${fmt(newCategory)}`
    );
  }

  // ── Status notification + email (APPROVED / REJECTED) ─────
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
    await db.from('notifications').insert({
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
    }).then(({ error: e }) => { if (e) console.error('Status notif failed:', e.message); });

    // Send email for APPROVED / REJECTED status
    if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
      const html = getTemplateStatusEmail(
        displayName,
        newStatus as 'APPROVED' | 'REJECTED',
        reason || null,
        dashboardUrl
      );
      await sendWebhookEmail(
        tenantId, db, html,
        newStatus === 'APPROVED'
          ? `✅ Template "${displayName}" Approved by Meta`
          : `❌ Template "${displayName}" Rejected by Meta`
      );
    }
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
