/**
 * campaign-queue.ts
 *
 * Replaces executeCampaignSend (the old sequential for-loop).
 *
 * Instead of doing everything in one Vercel function, this:
 * 1. Fetches all contacts for the segment
 * 2. Uploads template media header to Meta once (if applicable)
 * 3. Splits them into batches of BATCH_SIZE
 * 4. Enqueues each batch as a separate QStash HTTP message
 *    → QStash calls POST /api/campaigns/[id]/process-batch for each batch
 *    → Each batch runs in its own Vercel function (no timeout risk)
 *    → QStash auto-retries failed batches (up to 3 times by default)
 */

import { Client as QStashClient } from '@upstash/qstash';
import { createClient } from '@supabase/supabase-js';
import { getCachedContacts } from './redis';

const BATCH_SIZE = 50;

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3001';
}

/**
 * Upload a media file to Meta's WhatsApp media API.
 * Returns the media_id to use in template header parameters, or null on failure.
 *
 * Media IDs are valid for 30 days. We upload once per campaign and reuse
 * the same ID for all batches — much faster than uploading per-message.
 */
async function uploadMediaToMeta(
  token: string,
  phoneNumberId: string,
  mediaUrl: string,
  headerType: string  // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
): Promise<string | null> {
  try {
    // Fetch the binary from the stored URL
    const imgRes = await fetch(mediaUrl);
    if (!imgRes.ok) {
      console.error(`[campaign-queue] Failed to fetch media from ${mediaUrl}: ${imgRes.status}`);
      return null;
    }
    const imgBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || mimeForType(headerType);

    // POST to WhatsApp media upload endpoint
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', contentType);
    formData.append('file', new Blob([imgBuffer], { type: contentType }), 'media');

    const uploadRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    const uploadData = await uploadRes.json();

    if (uploadData.id) {
      console.log(`[campaign-queue] Uploaded media to Meta — id: ${uploadData.id}`);
      return uploadData.id;
    }
    console.error(`[campaign-queue] Meta media upload failed:`, JSON.stringify(uploadData));
    return null;
  } catch (err: any) {
    console.error(`[campaign-queue] Media upload error:`, err.message);
    return null;
  }
}

function mimeForType(headerType: string): string {
  switch (headerType.toUpperCase()) {
    case 'VIDEO':    return 'video/mp4';
    case 'DOCUMENT': return 'application/pdf';
    default:         return 'image/jpeg';
  }
}

export async function enqueueCampaignBatches(campaignId: string): Promise<void> {
  const db = serviceDb();

  // 1. Fetch the campaign
  const { data: campaign } = await db
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    console.error(`enqueueCampaignBatches: campaign ${campaignId} not found`);
    return;
  }

  // 2. Fetch contacts (with Redis cache)
  const contacts = await getCachedContacts(
    campaign.segment_id,
    campaign.tenant_id,
    async () => {
      const { data, error } = await db
        .from('contacts')
        .select('id, phone, name, email, custom1, custom2, custom3, opted_in')
        .eq('tenant_id', campaign.tenant_id)
        .eq('segment_id', campaign.segment_id)
        .or('opted_in.is.null,opted_in.eq.true');
      if (error) console.error(`[campaign-queue] DB error fetching contacts:`, error.message);
      console.log(`[campaign-queue] Fetched ${data?.length ?? 0} contacts for campaign ${campaignId} (segment ${campaign.segment_id})`);
      return data ?? [];
    }
  );

  if (!contacts || contacts.length === 0) {
    console.warn(`[campaign-queue] 0 contacts found for campaign ${campaignId} — marking as sent with 0.`);
    await db.from('campaigns').update({
      status:         'sent',
      total_contacts: 0,
      sent_count:     0,
      failed_count:   0,
      completed_at:   new Date().toISOString(),
    }).eq('id', campaignId);
    return;
  }

  // 3. If the template has a media header, upload it to Meta once and reuse the media_id.
  //    This avoids per-message re-uploads and fixes the 131053 "Media upload error".
  let headerMediaId: string | null = null;

  try {
    const [{ data: template }, { data: waConn }] = await Promise.all([
      db.from('templates').select('header_type, header_text').eq('id', campaign.template_id).single(),
      db.from('wa_connections').select('access_token, phone_number_id').eq('tenant_id', campaign.tenant_id).single(),
    ]);

    const mediaTypes = ['IMAGE', 'VIDEO', 'DOCUMENT'];
    // Prefer per-campaign media URL (set in wizard) over template's stored URL
    const campaignMediaUrl: string =
      campaign.variable_mapping?._header_media_url ||
      (template?.header_text?.startsWith('https://') ? template.header_text : '');

    if (
      template?.header_type &&
      mediaTypes.includes(template.header_type.toUpperCase()) &&
      campaignMediaUrl &&
      waConn?.access_token &&
      waConn?.phone_number_id
    ) {
      const uploadToken = process.env.META_SYSTEM_TOKEN || waConn.access_token;
      headerMediaId = await uploadMediaToMeta(
        uploadToken,
        waConn.phone_number_id,
        campaignMediaUrl,
        template.header_type
      );
    }
  } catch (err: any) {
    console.warn(`[campaign-queue] Could not pre-upload template media:`, err.message);
    // Non-fatal — batches will fall back to link-based sending
  }

  // 4. Split contacts into batches
  const batches: any[][] = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }
  const totalBatches = batches.length;

  // 5. Enqueue each batch to QStash BEFORE marking as 'sending'
  const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN! });
  const appUrl  = getAppUrl();
  const batchUrl = `${appUrl}/api/campaigns/${campaignId}/process-batch`;

  console.log(`Campaign ${campaignId}: enqueueing ${batches.length} batches to ${batchUrl}`);

  const publishPromises = batches.map((batch, index) =>
    qstash.publishJSON({
      url: batchUrl,
      body: {
        campaignId,
        batchIndex:    index,
        totalBatches,
        totalContacts: contacts.length,
        contacts:      batch,
        headerMediaId: headerMediaId ?? undefined,  // reuse same id for all batches
      },
      retries: 3,
      delay: index > 0 ? `${index}s` : undefined,
    })
  );

  const results = await Promise.allSettled(publishPromises);
  const failedEnqueues = results.filter(r => r.status === 'rejected');

  if (failedEnqueues.length === results.length) {
    console.error(`enqueueCampaignBatches: ALL ${totalBatches} batches failed to enqueue. Resetting campaign to queued.`);
    await db.from('campaigns').update({ status: 'queued' }).eq('id', campaignId);
    return;
  }

  if (failedEnqueues.length > 0) {
    console.error(`enqueueCampaignBatches: ${failedEnqueues.length}/${totalBatches} batches failed to enqueue`);
  }

  // 6. Mark as 'sending' after successful enqueue
  await db.from('campaigns').update({
    status:         'sending',
    total_contacts: contacts.length,
  }).eq('id', campaignId);

  console.log(`Campaign ${campaignId}: enqueued ${totalBatches} batches (${contacts.length} contacts total)`);
}
