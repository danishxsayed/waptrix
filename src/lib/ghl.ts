/**
 * GoHighLevel Private Integration
 * Syncs inbound WhatsApp messages to GHL as contacts + conversation messages.
 * Uses the GHL API v2 with a Private Integration Token — no workflow triggers, no cost.
 */

import { createClient } from '@supabase/supabase-js';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

function ghlHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Version': GHL_VERSION,
  };
}

/** Upsert a contact in GHL by phone number. Returns the GHL contact id. */
async function upsertContact(
  token: string,
  locationId: string,
  phone: string,
  name?: string,
): Promise<string | null> {
  try {
    // Search for existing contact by phone
    const searchRes = await fetch(
      `${GHL_BASE}/contacts/search/duplicate?locationId=${locationId}&phone=${encodeURIComponent(phone)}`,
      { headers: ghlHeaders(token) }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = searchData?.contact;
      if (existing?.id) return existing.id;
    }

    // Create new contact
    const createBody: Record<string, any> = {
      locationId,
      phone,
      source: 'WhatsApp via Waptrix',
    };
    if (name) {
      const parts = name.trim().split(/\s+/);
      createBody.firstName = parts[0];
      if (parts.length > 1) createBody.lastName = parts.slice(1).join(' ');
    }

    const createRes = await fetch(`${GHL_BASE}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      console.error('[ghl] Failed to create contact:', await createRes.text());
      return null;
    }

    const createData = await createRes.json();
    return createData?.contact?.id ?? null;
  } catch (err: any) {
    console.error('[ghl] upsertContact error:', err.message);
    return null;
  }
}

/** Get or create a GHL conversation for a contact. Returns conversation id. */
async function getOrCreateConversation(
  token: string,
  locationId: string,
  contactId: string,
): Promise<string | null> {
  try {
    // Search for existing conversation
    const searchRes = await fetch(
      `${GHL_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}`,
      { headers: ghlHeaders(token) }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = searchData?.conversations?.[0];
      if (existing?.id) return existing.id;
    }

    // Create conversation
    const createRes = await fetch(`${GHL_BASE}/conversations/`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({ locationId, contactId }),
    });

    if (!createRes.ok) {
      console.error('[ghl] Failed to create conversation:', await createRes.text());
      return null;
    }

    const createData = await createRes.json();
    return createData?.conversation?.id ?? null;
  } catch (err: any) {
    console.error('[ghl] getOrCreateConversation error:', err.message);
    return null;
  }
}

/** Post a WhatsApp message into a GHL conversation, with note fallback. */
async function addMessageWithFallback(
  token: string,
  conversationId: string,
  contactId: string,
  messageBody: string,
  direction: 'inbound' | 'outbound' = 'inbound',
): Promise<void> {
  try {
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({
        conversationId,
        type: 'WhatsApp',
        message: messageBody,
        direction,
        date: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[ghl] Failed to add message:', res.status, errText);

      // Fallback: add as a contact note so message is visible regardless
      await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: ghlHeaders(token),
        body: JSON.stringify({
          body: `📲 WhatsApp ${direction}: ${messageBody}`,
        }),
      }).catch(() => {});
    }
  } catch (err: any) {
    console.error('[ghl] addMessage error:', err.message);
  }
}

/**
 * Main entry point — called when a WhatsApp message is received.
 * Silently swallows errors so GHL issues never affect the main flow.
 */
export async function syncToGHL(
  tenantId: string,
  phone: string,
  messageBody: string,
  contactName?: string,
  direction: 'inbound' | 'outbound' = 'inbound',
): Promise<void> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: tenant } = await db
      .from('tenants')
      .select('ghl_token, ghl_location_id')
      .eq('id', tenantId)
      .maybeSingle();

    const token = tenant?.ghl_token;
    const locationId = tenant?.ghl_location_id;

    if (!token || !locationId) return; // GHL not configured for this tenant

    const contactId = await upsertContact(token, locationId, phone, contactName);
    if (!contactId) return;

    const conversationId = await getOrCreateConversation(token, locationId, contactId);
    if (!conversationId) return;

    await addMessageWithFallback(token, conversationId, contactId, messageBody, direction);
  } catch {
    // Never let GHL errors affect the main flow
  }
}
