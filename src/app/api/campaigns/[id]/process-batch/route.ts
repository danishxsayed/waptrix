export const dynamic = 'force-dynamic';

/**
 * POST /api/campaigns/[id]/process-batch
 *
 * Called exclusively by QStash — never directly by the client.
 * Verifies the QStash signature before processing.
 *
 * Body (sent by QStash):
 *   campaignId    – string
 *   batchIndex    – number (0-based)
 *   totalBatches  – number
 *   totalContacts – number
 *   contacts      – Contact[] (up to 50)
 */

import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { createClient } from '@supabase/supabase-js';
import {
  getCachedWaConnection,
  getCachedTemplate,
  checkMetaRateLimit,
  incrCampaignSent,
  incrCampaignFailed,
  getCampaignStats,
  cleanupCampaignStats,
} from '@/lib/redis';
import { metaApi } from '@/lib/meta';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function normalizePhone(phone: string): string {
  return phone.replace(/^\+/, '');
}

function buildComponents(templateBody: string, variableMapping: Record<string, string>, contact: any): any[] {
  const varMatches = templateBody.match(/\{\{(\d+)\}\}/g) || [];
  if (varMatches.length === 0) return [];

  const parameters = varMatches.map((v) => {
    const num = v.replace('{{', '').replace('}}', '');
    const fieldName = variableMapping[num] || '';

    // Resolve value from contact field — never send literal {{N}} to Meta
    let value: string = '';
    if (fieldName && contact[fieldName] != null && String(contact[fieldName]).trim() !== '') {
      value = String(contact[fieldName]);
    } else {
      // Fallback: use contact name → phone → a safe placeholder
      value = contact.name || contact.phone || 'Customer';
    }

    return { type: 'text', text: value };
  });

  return [{ type: 'body', parameters }];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // ── 1. Verify QStash signature ───────────────────────────────
  // This ensures only Upstash can call this endpoint — not random internet traffic
  const receiver = new Receiver({
    currentSigningKey:  process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey:     process.env.QSTASH_NEXT_SIGNING_KEY!,
  });

  const rawBody  = await req.text();
  const signature = req.headers.get('upstash-signature') ?? '';

  try {
    await receiver.verify({ signature, body: rawBody });
  } catch {
    console.error('process-batch: invalid QStash signature');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse body ────────────────────────────────────────────
  let payload: {
    campaignId:    string;
    batchIndex:    number;
    totalBatches:  number;
    totalContacts: number;
    contacts:      any[];
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { batchIndex, totalBatches, totalContacts, contacts } = payload;
  const db = serviceDb();

  // ── 3. Load campaign (with Redis-cached WA connection + template) ──
  const { data: campaign } = await db
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Use Redis cache for WA connection and template — avoids Supabase hits on every batch
  const waConnection = await getCachedWaConnection(campaign.tenant_id, async () => {
    const { data } = await db
      .from('wa_connections')
      .select('*')
      .eq('tenant_id', campaign.tenant_id)
      .single();
    return data;
  });

  const template = await getCachedTemplate(campaign.template_id, async () => {
    const { data } = await db
      .from('templates')
      .select('*')
      .eq('id', campaign.template_id)
      .single();
    return data;
  });

  if (!waConnection || !template) {
    await db.from('campaigns').update({ status: 'failed' }).eq('id', campaignId);
    return NextResponse.json({ error: 'Missing WA connection or template' }, { status: 400 });
  }

  const sendToken       = process.env.META_SYSTEM_TOKEN || waConnection.access_token;
  const variableMapping = campaign.variable_mapping || {};
  const now             = new Date().toISOString();
  const templateName    = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // ── 4. Process each contact in the batch ────────────────────
  let batchSent   = 0;
  let batchFailed = 0;
  const logInserts: any[]  = [];
  const msgInserts: any[]  = [];
  const convUpdates: { id: string; name: string }[] = [];

  for (const contact of contacts) {
    const normalizedPhone = normalizePhone(contact.phone);

    try {
      // Idempotency: skip if already sent (handles QStash retries safely)
      const { data: existingLog } = await db
        .from('message_logs')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (existingLog) {
        batchSent++;
        continue;
      }

      // Rate limit: respect Meta's ~80 msg/sec cap
      await checkMetaRateLimit(waConnection.phone_number_id);

      const runtimeComponents = buildComponents(template.body || '', variableMapping, contact);

      const response = await metaApi.sendTemplateMessage(
        sendToken,
        waConnection.phone_number_id,
        {
          to:           normalizedPhone,
          templateName,
          languageCode: template.language,
          components:   runtimeComponents,
        }
      );

      const metaMsgId      = response?.messages?.[0]?.id ?? null;
      const messageContent = `[Template: ${template.name}]`;

      // Upsert conversation
      const { data: existingConv } = await db
        .from('conversations')
        .select('id')
        .eq('tenant_id', campaign.tenant_id)
        .or(`contact_phone.eq.${normalizedPhone},contact_phone.eq.+${normalizedPhone}`)
        .maybeSingle();

      if (existingConv) {
        // Existing conversation — update + queue chat_message
        convUpdates.push({ id: existingConv.id, name: contact.name || normalizedPhone });
        msgInserts.push({
          tenant_id:       campaign.tenant_id,
          conversation_id: existingConv.id,
          direction:       'outbound',
          meta_message_id: metaMsgId,
          type:            'template',
          content:         messageContent,
          status:          'sent',
          created_at:      now,
        });
      } else {
        // New conversation — create it now so we have the ID for chat_messages
        const { data: newConv } = await db
          .from('conversations')
          .insert({
            tenant_id:       campaign.tenant_id,
            contact_phone:   normalizedPhone,
            contact_name:    contact.name || normalizedPhone,
            last_message:    messageContent,
            last_message_at: now,
            unread_count:    0,
            status:          'open',
          })
          .select('id')
          .single();

        if (newConv?.id) {
          msgInserts.push({
            tenant_id:       campaign.tenant_id,
            conversation_id: newConv.id,
            direction:       'outbound',
            meta_message_id: metaMsgId,
            type:            'template',
            content:         messageContent,
            status:          'sent',
            created_at:      now,
          });
        }
      }

      logInserts.push({
        campaign_id: campaignId,
        tenant_id:   campaign.tenant_id,
        contact_id:  contact.id,
        phone:       contact.phone,
        status:      'sent',
        meta_msg_id: metaMsgId,
        sent_at:     now,
      });

      batchSent++;
    } catch (err: any) {
      const metaErr  = err.response?.data?.error;
      const errorMsg = metaErr
        ? `[${metaErr.code || ''}] ${metaErr.message || err.message}`
        : (err.message || String(err));

      logInserts.push({
        campaign_id: campaignId,
        tenant_id:   campaign.tenant_id,
        contact_id:  contact.id,
        phone:       contact.phone,
        status:      'failed',
        error:       errorMsg,
      });
      batchFailed++;
    }
  }

  // ── 5. Bulk DB writes ────────────────────────────────────────
  // Update existing conversations
  const messageContent = `[Template: ${template.name}]`;
  for (const upd of convUpdates) {
    await db.from('conversations').update({
      contact_name:    upd.name,
      last_message:    messageContent,
      last_message_at: now,
    }).eq('id', upd.id);
  }

  // Bulk insert message_logs
  if (logInserts.length > 0) {
    await db.from('message_logs').insert(logInserts);
  }

  // Bulk insert chat_messages
  if (msgInserts.length > 0) {
    await db.from('chat_messages').insert(msgInserts);
  }

  // ── 6. Atomic campaign counters in Redis ─────────────────────
  const [totalSent, totalFailed] = await Promise.all([
    incrCampaignSent(campaignId, batchSent),
    incrCampaignFailed(campaignId, batchFailed),
  ]);

  // ── 7. If last batch → finalise campaign in Supabase ─────────
  const isLastBatch = batchIndex === totalBatches - 1;

  if (isLastBatch) {
    const stats = await getCampaignStats(campaignId);
    await db.from('campaigns').update({
      status:         'sent',
      sent_count:     stats.sent,
      failed_count:   stats.failed,
      total_contacts: totalContacts,
      completed_at:   now,
    }).eq('id', campaignId);
    await cleanupCampaignStats(campaignId);
    console.log(`Campaign ${campaignId} complete: ${stats.sent} sent, ${stats.failed} failed`);
  } else {
    // Update partial progress so the UI shows live progress
    await db.from('campaigns').update({
      sent_count:   totalSent,
      failed_count: totalFailed,
    }).eq('id', campaignId);
  }

  return NextResponse.json({
    ok:          true,
    batchIndex,
    batchSent,
    batchFailed,
    isLastBatch,
  });
}
