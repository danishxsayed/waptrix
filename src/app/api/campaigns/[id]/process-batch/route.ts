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
  invalidateWaConnection,
} from '@/lib/redis';
import { metaApi } from '@/lib/meta';
import { getCampaignAnalyticsEmail } from '@/lib/email/template';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

/**
 * Normalize a phone number to bare E.164 digits (no + or other characters).
 * Meta's API requires digits only, no + prefix, no spaces, no dashes.
 * Examples: "+91 98765-43210" → "919876543210", "+971501234567" → "971501234567"
 */
function normalizePhone(phone: string): string {
  // Strip every non-digit character (spaces, dashes, brackets, +)
  return (phone || '').replace(/\D/g, '');
}

function buildComponents(template: any, variableMapping: Record<string, string>, contact: any): any[] {
  const components: any[] = [];

  // Header component — required for IMAGE / VIDEO / DOCUMENT templates
  if (template.header_type && template.header_text) {
    const headerType = template.header_type.toLowerCase(); // 'image' | 'video' | 'document'
    if (['image', 'video', 'document'].includes(headerType)) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: headerType,
            [headerType]: { link: template.header_text },
          },
        ],
      });
    }
  }

  // Body component — only when the template body has {{N}} variables
  const varMatches = (template.body || '').match(/\{\{(\d+)\}\}/g) || [];
  if (varMatches.length > 0) {
    const parameters = varMatches.map((v: string) => {
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

    components.push({ type: 'body', parameters });
  }

  return components;
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

  // System token preferred, but we fall back to tenant's own token on permission errors
  const systemToken     = process.env.META_SYSTEM_TOKEN;
  const tenantToken     = waConnection.access_token;
  const sendToken       = systemToken || tenantToken;
  const variableMapping = campaign.variable_mapping || {};
  const now             = new Date().toISOString();
  // Template name must be lowercase + underscores to match what was submitted to Meta
  const templateName    = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const messageContent  = `[Template: ${template.name}]`;

  // ── 4. Idempotency — batch check for already-sent contacts ──
  // Single DB call instead of one per contact (much faster at scale)
  const contactIds = contacts.map((c: any) => c.id);
  const { data: existingLogs } = await db
    .from('message_logs')
    .select('contact_id')
    .eq('campaign_id', campaignId)
    .in('contact_id', contactIds);

  const alreadySentIds = new Set((existingLogs || []).map((l: any) => l.contact_id));

  // Also skip opted-out contacts (opted_in === false) — never send to them
  const pendingContacts = contacts.filter(
    (c: any) => !alreadySentIds.has(c.id) && c.opted_in !== false
  );
  const skippedCount = contacts.length - pendingContacts.length; // includes opted-out + already-sent

  // ── 5. Send all pending contacts in parallel (CONCURRENCY = 20) ──
  // 20x faster than sequential — each slot does: rate-limit → Meta API → conv upsert
  const CONCURRENCY = 20;
  let batchSent   = skippedCount; // already-sent contacts count as sent (idempotency)
  let batchFailed = 0;
  const logInserts: any[]  = [];
  const msgInserts: any[]  = [];
  const convUpdates: { id: string; name: string }[] = [];

  // Process contacts in parallel chunks
  for (let i = 0; i < pendingContacts.length; i += CONCURRENCY) {
    const chunk = pendingContacts.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (contact: any) => {
        const normalizedPhone = normalizePhone(contact.phone);

        // Rate limit: respect Meta's ~80 msg/sec cap
        await checkMetaRateLimit(waConnection.phone_number_id);

        const runtimeComponents = buildComponents(template, variableMapping, contact);
        // Only include components if non-empty — Meta rejects explicit [] for simple templates
        const templateComponents = runtimeComponents.length > 0 ? runtimeComponents : undefined;

        /** Send via Meta API with automatic fallback from system token → tenant token */
        async function sendWithFallback(token: string, isRetry = false): Promise<any> {
          try {
            return await metaApi.sendTemplateMessage(
              token,
              waConnection.phone_number_id,
              {
                to:           normalizedPhone,
                templateName,
                languageCode: template.language,
                components:   templateComponents,
              }
            );
          } catch (err: any) {
            const errCode = err?.response?.data?.error?.code;
            // Error 200 = permissions; 190 = token expired/invalid
            // If we were using the system token, retry with the tenant's own token
            if (!isRetry && systemToken && token === systemToken && (errCode === 200 || errCode === 190)) {
              console.warn(`[process-batch] System token failed (code ${errCode}) for ${normalizedPhone}, retrying with tenant token`);
              // Invalidate the cached WA connection so the next batch doesn't reuse a bad token
              await invalidateWaConnection(campaign.tenant_id);
              return sendWithFallback(tenantToken, true);
            }
            throw err; // propagate so Promise.allSettled marks it as rejected
          }
        }

        const response = await sendWithFallback(sendToken);

        const metaMsgId = response?.messages?.[0]?.id ?? null;

        // Upsert conversation
        const { data: existingConv } = await db
          .from('conversations')
          .select('id')
          .eq('tenant_id', campaign.tenant_id)
          .or(`contact_phone.eq.${normalizedPhone},contact_phone.eq.+${normalizedPhone}`)
          .maybeSingle();

        if (existingConv) {
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

        return { contact, metaMsgId, status: 'sent' as const };
      })
    );

    // Collect results from this chunk
    for (let j = 0; j < results.length; j++) {
      const contact = chunk[j];
      const result  = results[j];

      if (result.status === 'fulfilled') {
        logInserts.push({
          campaign_id: campaignId,
          tenant_id:   campaign.tenant_id,
          contact_id:  contact.id,
          phone:       contact.phone,
          status:      'sent',
          meta_msg_id: result.value.metaMsgId,
          sent_at:     now,
        });
        batchSent++;
      } else {
        const err     = result.reason;
        const metaErr = err?.response?.data?.error;

        // Build a rich error string that includes all Meta error fields
        let errorMsg: string;
        if (metaErr) {
          const parts: string[] = [];
          if (metaErr.code)          parts.push(`code=${metaErr.code}`);
          if (metaErr.error_subcode) parts.push(`subcode=${metaErr.error_subcode}`);
          if (metaErr.type)          parts.push(`type=${metaErr.type}`);
          if (metaErr.message)       parts.push(metaErr.message);
          if (metaErr.error_data)    parts.push(`data=${JSON.stringify(metaErr.error_data)}`);
          if (metaErr.fbtrace_id)    parts.push(`trace=${metaErr.fbtrace_id}`);
          errorMsg = parts.join(' | ');
        } else {
          errorMsg = err?.message || String(err);
        }

        console.error(`[process-batch] Failed to send to ${contact.phone}: ${errorMsg}`);

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
  }

  // ── 6. Bulk DB writes ────────────────────────────────────────
  // Update existing conversations in parallel
  await Promise.all(
    convUpdates.map((upd) =>
      db.from('conversations').update({
        contact_name:    upd.name,
        last_message:    messageContent,
        last_message_at: now,
      }).eq('id', upd.id)
    )
  );

  // Bulk insert message_logs + chat_messages in parallel
  await Promise.all([
    logInserts.length > 0 ? db.from('message_logs').insert(logInserts) : Promise.resolve(),
    msgInserts.length > 0 ? db.from('chat_messages').insert(msgInserts) : Promise.resolve(),
  ]);

  // ── 7. Atomic campaign counters in Redis ─────────────────────
  const [totalSent, totalFailed] = await Promise.all([
    incrCampaignSent(campaignId, batchSent),
    incrCampaignFailed(campaignId, batchFailed),
  ]);

  // ── 8. If last batch → finalise campaign in Supabase ─────────
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

    // Send campaign analytics email to the tenant
    try {
      // Get tenant email from Supabase Auth
      const { data: userData } = await db.auth.admin.getUserById(campaign.tenant_id);
      const userEmail = userData?.user?.email;

      if (userEmail && process.env.RESEND_API_KEY) {
        // Fetch final campaign row to get delivered/read counts (updated by webhook)
        const { data: finalCampaign } = await db
          .from('campaigns')
          .select('name, sent_count, failed_count, delivered_count, read_count')
          .eq('id', campaignId)
          .single();

        const sentCount      = finalCampaign?.sent_count      ?? stats.sent;
        const failedCount    = finalCampaign?.failed_count     ?? stats.failed;
        const deliveredCount = finalCampaign?.delivered_count  ?? 0;
        const readCount      = finalCampaign?.read_count       ?? 0;
        const deliveryRate   = sentCount > 0
          ? Number(((deliveredCount > 0 ? deliveredCount : sentCount) / (sentCount + failedCount) * 100).toFixed(1))
          : 0;
        const readRate       = sentCount > 0
          ? Number((readCount / sentCount * 100).toFixed(1))
          : 0;

        const appUrl         = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
        const completedAt    = new Date(now).toLocaleString('en-US', {
          weekday: 'short', year: 'numeric', month: 'short',
          day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        });

        const html = getCampaignAnalyticsEmail({
          campaignName:   finalCampaign?.name || campaignId,
          totalContacts,
          sent:           sentCount,
          failed:         failedCount,
          delivered:      deliveredCount,
          read:           readCount,
          deliveryRate,
          readRate,
          dashboardUrl:   `${appUrl}/analytics`,
          completedAt,
        });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Waptrix <no-reply@waptrix.in>',
            to:   userEmail,
            subject: `📊 Campaign "${finalCampaign?.name || campaignId}" — ${stats.sent} messages sent`,
            html,
          }),
        });

        console.log(`Campaign analytics email sent to ${userEmail}`);
      }
    } catch (emailErr: any) {
      // Non-fatal — campaign is complete regardless of email success
      console.error('Failed to send campaign analytics email:', emailErr.message);
    }
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
