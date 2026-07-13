import { Redis } from '@upstash/redis';

// Singleton Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── TTLs (seconds) ──────────────────────────────────────────
const TTL = {
  WA_CONNECTION: 300,   // 5 min — rarely changes
  TEMPLATE:      600,   // 10 min
  CONTACTS:      300,   // 5 min per segment
};

// ── Cache helpers ────────────────────────────────────────────

export async function getCachedWaConnection(tenantId: string, fetcher: () => Promise<any>) {
  const key = `wa:${tenantId}`;
  const cached = await redis.get(key);
  if (cached) return cached;
  const fresh = await fetcher();
  if (fresh) await redis.set(key, fresh, { ex: TTL.WA_CONNECTION });
  return fresh;
}

export async function getCachedTemplate(templateId: string, fetcher: () => Promise<any>) {
  const key = `tmpl:${templateId}`;
  const cached = await redis.get(key);
  if (cached) return cached;
  const fresh = await fetcher();
  if (fresh) await redis.set(key, fresh, { ex: TTL.TEMPLATE });
  return fresh;
}

export async function getCachedContacts(segmentId: string, tenantId: string, fetcher: () => Promise<any[]>) {
  const key = `contacts:${tenantId}:${segmentId}`;
  const cached = await redis.get<any[]>(key);
  if (cached) return cached;
  const fresh = await fetcher();
  if (fresh) await redis.set(key, fresh, { ex: TTL.CONTACTS });
  return fresh;
}

export function invalidateWaConnection(tenantId: string) {
  return redis.del(`wa:${tenantId}`);
}

export function invalidateTemplate(templateId: string) {
  return redis.del(`tmpl:${templateId}`);
}

export function invalidateContacts(segmentId: string, tenantId: string) {
  return redis.del(`contacts:${tenantId}:${segmentId}`);
}

// ── Meta API rate limiting ───────────────────────────────────
// Meta allows ~80 messages/sec per phone number.
// We use a sliding 1-second window counter in Redis.

export async function checkMetaRateLimit(phoneNumberId: string): Promise<void> {
  const key = `rate:meta:${phoneNumberId}:${Math.floor(Date.now() / 1000)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 2); // expire after 2s (covers window boundary)
  if (count > 75) {
    // Back off for the remainder of this second
    const ms = 1000 - (Date.now() % 1000);
    await new Promise(r => setTimeout(r, ms + 50));
  }
}

// ── Campaign stats (atomic counters during send) ─────────────

export async function incrCampaignSent(campaignId: string, by: number) {
  return redis.incrby(`campaign:${campaignId}:sent`, by);
}

export async function incrCampaignFailed(campaignId: string, by: number) {
  return redis.incrby(`campaign:${campaignId}:failed`, by);
}

export async function getCampaignStats(campaignId: string) {
  const [sent, failed] = await Promise.all([
    redis.get<number>(`campaign:${campaignId}:sent`),
    redis.get<number>(`campaign:${campaignId}:failed`),
  ]);
  return { sent: sent ?? 0, failed: failed ?? 0 };
}

export async function cleanupCampaignStats(campaignId: string) {
  await Promise.all([
    redis.del(`campaign:${campaignId}:sent`),
    redis.del(`campaign:${campaignId}:failed`),
  ]);
}
