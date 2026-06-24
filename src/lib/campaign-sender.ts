/**
 * Campaign send logic — shared by the immediate POST handler and the cron worker.
 * Kept in lib/ so it can be imported by route files without polluting their exports.
 */

import { createClient } from '@supabase/supabase-js';
import { metaApi } from '@/lib/meta';

function normalizePhone(phone: string): string {
  return phone.replace(/^\+/, '');
}

function buildRuntimeComponents(
  templateBody: string,
  variableMapping: Record<string, string>,
  contact: Record<string, any>
): any[] {
  const varMatches = templateBody.match(/\{\{(\d+)\}\}/g) || [];
  if (varMatches.length === 0) return [];

  const parameters = varMatches.map((v) => {
    const num = v.replace('{{', '').replace('}}', '');
    const fieldName = variableMapping[num] || '';
    const value = contact[fieldName] || fieldName || `{{${num}}}`;
    return { type: 'text', text: String(value) };
  });

  return [{ type: 'body', parameters }];
}

export async function executeCampaignSend(campaignId: string): Promise<void> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Fetch campaign
  const { data: campaign } = await db
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    console.error(`executeCampaignSend: campaign ${campaignId} not found`);
    return;
  }

  // Fetch template and wa_connection separately (campaigns has no FK to wa_connections)
  const [{ data: template }, { data: waConnection }] = await Promise.all([
    db.from('templates').select('*').eq('id', campaign.template_id).single(),
    db.from('wa_connections').select('*').eq('tenant_id', campaign.tenant_id).single(),
  ]);

  if (!template || !waConnection) {
    await db.from('campaigns').update({ status: 'failed' }).eq('id', campaignId);
    console.error(`executeCampaignSend: missing template or WA connection for ${campaignId}`);
    return;
  }

  // Fetch contacts in this segment
  const { data: contacts } = await db
    .from('contacts')
    .select('id, phone, name, email, custom1, custom2, custom3')
    .eq('tenant_id', campaign.tenant_id)
    .eq('segment_id', campaign.segment_id);

  if (!contacts || contacts.length === 0) {
    await db.from('campaigns').update({
      status:          'sent',
      total_contacts:  0,
      sent_count:      0,
      failed_count:    0,
      completed_at:    new Date().toISOString(),
    }).eq('id', campaignId);
    return;
  }

  await db.from('campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const sendToken        = process.env.META_SYSTEM_TOKEN || waConnection.access_token;
  const variableMapping  = campaign.variable_mapping || {};

  let sentCount   = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    try {
      const runtimeComponents = buildRuntimeComponents(
        template.body || '',
        variableMapping,
        contact
      );

      const normalizedPhone = normalizePhone(contact.phone);

      const response = await metaApi.sendTemplateMessage(
        sendToken,
        waConnection.phone_number_id,
        {
          to:           normalizedPhone,
          templateName: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          languageCode: template.language,
          components:   runtimeComponents,
        }
      );

      const metaMsgId     = response?.messages?.[0]?.id || null;
      const now           = new Date().toISOString();
      const messageContent = `[Template: ${template.name}]`;

      // ── Sync to inbox ──────────────────────────────────────────
      const { data: existingConv } = await db
        .from('conversations')
        .select('id, unread_count')
        .eq('tenant_id', campaign.tenant_id)
        .or(`contact_phone.eq.${normalizedPhone},contact_phone.eq.+${normalizedPhone}`)
        .maybeSingle();

      let conversationId: string;
      if (existingConv) {
        conversationId = existingConv.id;
        await db.from('conversations').update({
          contact_name:    contact.name || normalizedPhone,
          last_message:    messageContent,
          last_message_at: now,
        }).eq('id', conversationId);
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
        conversationId = newConv!.id;
      }

      await db.from('chat_messages').insert({
        tenant_id:       campaign.tenant_id,
        conversation_id: conversationId,
        direction:       'outbound',
        meta_message_id: metaMsgId,
        type:            'template',
        content:         messageContent,
        status:          'sent',
        created_at:      now,
      });
      // ──────────────────────────────────────────────────────────

      await db.from('message_logs').insert({
        campaign_id: campaignId,
        tenant_id:   campaign.tenant_id,
        contact_id:  contact.id,
        phone:       contact.phone,
        status:      'sent',
        meta_msg_id: metaMsgId,
        sent_at:     now,
      });

      sentCount++;
    } catch (sendErr: any) {
      const metaErr  = sendErr.response?.data?.error;
      const errorMsg = metaErr
        ? `[${metaErr.code || metaErr.error_subcode || ''}] ${metaErr.message || metaErr.error_data?.details || sendErr.message}`
        : (sendErr.message || String(sendErr));

      console.error(`Send failed for ${contact.phone}:`, errorMsg);

      await db.from('message_logs').insert({
        campaign_id: campaignId,
        tenant_id:   campaign.tenant_id,
        contact_id:  contact.id,
        phone:       contact.phone,
        status:      'failed',
        error:       errorMsg,
      });
      failedCount++;
    }
  }

  await db.from('campaigns').update({
    status:          'sent',
    sent_count:      sentCount,
    failed_count:    failedCount,
    total_contacts:  contacts.length,
    completed_at:    new Date().toISOString(),
  }).eq('id', campaignId);

  console.log(`Campaign ${campaignId} complete: ${sentCount} sent, ${failedCount} failed`);
}
