/**
 * campaign-queue.ts
 *
 * Replaces executeCampaignSend (the old sequential for-loop).
 *
 * Instead of doing everything in one Vercel function, this:
 * 1. Fetches all contacts for the segment
 * 2. Splits them into batches of BATCH_SIZE
 * 3. Enqueues each batch as a separate QStash HTTP message
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
  // Use explicit production URL if set, otherwise fall back to Vercel's auto-injected URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3001';
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
      const { data } = await db
        .from('contacts')
        .select('id, phone, name, email, custom1, custom2, custom3')
        .eq('tenant_id', campaign.tenant_id)
        .eq('segment_id', campaign.segment_id);
      return data ?? [];
    }
  );

  if (!contacts || contacts.length === 0) {
    await db.from('campaigns').update({
      status:         'sent',
      total_contacts: 0,
      sent_count:     0,
      failed_count:   0,
      completed_at:   new Date().toISOString(),
    }).eq('id', campaignId);
    return;
  }

  // 3. Split contacts into batches
  const batches: any[][] = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }
  const totalBatches = batches.length;

  // 4. Mark campaign as queued + set total_contacts
  await db.from('campaigns').update({
    status:         'sending',
    total_contacts: contacts.length,
  }).eq('id', campaignId);

  // 5. Enqueue each batch to QStash
  const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN! });
  const appUrl  = getAppUrl();
  const batchUrl = `${appUrl}/api/campaigns/${campaignId}/process-batch`;

  const publishPromises = batches.map((batch, index) =>
    qstash.publishJSON({
      url: batchUrl,
      body: {
        campaignId,
        batchIndex:   index,
        totalBatches,
        totalContacts: contacts.length,
        contacts:     batch,
      },
      // Retry up to 3 times with exponential backoff
      retries: 3,
      // Delay batches slightly to respect Meta rate limits (50 msgs per batch)
      // 50 messages / 75 msg-per-sec = ~0.67s → add 1s delay between batches
      delay: index > 0 ? `${index}s` : undefined,
    })
  );

  const results = await Promise.allSettled(publishPromises);
  const failed  = results.filter(r => r.status === 'rejected');

  if (failed.length > 0) {
    console.error(`enqueueCampaignBatches: ${failed.length}/${totalBatches} batches failed to enqueue`);
  }

  console.log(`Campaign ${campaignId}: enqueued ${totalBatches} batches (${contacts.length} contacts total)`);
}
