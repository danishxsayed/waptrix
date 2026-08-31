/**
 * Outbound Webhook Dispatcher
 * Fires events to customer-configured CRM URLs whenever key events occur.
 * Payload is signed with HMAC-SHA256 so the CRM can verify authenticity.
 */

import { createHmac, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export type WebhookEvent =
  | 'message.received'
  | 'message.sent'
  | 'message.status'
  | 'conversation.created'
  | 'contact.opted_out'
  | 'contact.opted_in';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  tenant_id: string;
  contact?: {
    phone: string;
    name?: string;
  };
  conversation_id?: string;
  message?: {
    id?: string;
    type: string;
    content: string;
    direction: 'inbound' | 'outbound';
    status?: string;
    timestamp?: string;
  };
}

/** Generate a new random webhook secret */
export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(24).toString('hex');
}

/** Sign a payload with HMAC-SHA256 */
function sign(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Fire an outbound webhook for a tenant.
 * Silently swallows errors so webhook failures never break the main flow.
 */
export async function fireWebhook(
  tenantId: string,
  payload: WebhookPayload,
  webhookUrl?: string,
  webhookSecret?: string,
): Promise<void> {
  try {
    // If not pre-supplied, fetch from DB
    let url = webhookUrl;
    let secret = webhookSecret;

    if (!url || !secret) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
      );
      const { data: tenant } = await db
        .from('tenants')
        .select('webhook_url, webhook_secret')
        .eq('id', tenantId)
        .maybeSingle();

      url = tenant?.webhook_url;
      secret = tenant?.webhook_secret;
    }

    if (!url) return; // no webhook configured — skip silently

    const body = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
    const signature = secret ? sign(body, secret) : '';

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Waptrix-Event': payload.event,
        'X-Waptrix-Signature': signature,
        'X-Waptrix-Tenant': tenantId,
        'User-Agent': 'Waptrix-Webhook/1.0',
      },
      body,
      // Don't wait more than 8s — fire and forget
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Never let webhook errors affect the main flow
  }
}
