export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/contacts/check-whatsapp
 * BSP contacts validation — checks whether phone numbers are registered on WhatsApp
 * without sending any message.
 *
 * Uses Meta's BSP contacts check endpoint:
 * POST /{phone_number_id}/contacts  (available to Solution Provider accounts)
 *
 * Body: { phones: string[] }   — array of E.164 phone numbers (max 100 per call)
 * Returns: { valid: string[], invalid: string[], unsupported: boolean }
 *   - valid:       numbers confirmed as registered on WhatsApp
 *   - invalid:     numbers confirmed as NOT registered on WhatsApp
 *   - unsupported: true if this account doesn't have BSP contacts API access
 *                  (caller should fall back to format-only validation)
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get tenant's WA credentials
    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.phone_number_id || !conn?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected.' }, { status: 400 });
    }

    const body = await req.json();
    const phones: string[] = (body.phones || []).slice(0, 100); // max 100 per batch

    if (phones.length === 0) {
      return NextResponse.json({ valid: [], invalid: [] });
    }

    // Use system token if available (preferred for BSP operations), else tenant token
    const token = process.env.META_SYSTEM_TOKEN || conn.access_token;
    const phoneNumberId = conn.phone_number_id;

    // ── Attempt BSP contacts check endpoint ──────────────────────────────────
    // This endpoint is available to Meta Solution Provider (BSP) accounts.
    // It returns WhatsApp registration status without sending any message.
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocking: 'wait',         // synchronous — wait for result
          contacts: phones,          // E.164 format numbers
          force_check: false,        // use cached result if available
        }),
      }
    );

    const metaData = await metaRes.json();

    // If Meta returns 100 (Graph API error) or 404 — BSP endpoint not available
    // for this account tier. Tell the caller to fall back.
    if (metaData.error) {
      const errCode = metaData.error.code;
      // 100 = Invalid parameter / no BSP access  |  10 = Permission denied
      if ([100, 10, 200, 190].includes(errCode)) {
        console.warn('[check-whatsapp] BSP contacts API not available:', metaData.error.message);
        return NextResponse.json({ valid: [], invalid: [], unsupported: true });
      }
      return NextResponse.json({ error: metaData.error.message }, { status: 400 });
    }

    // Parse results
    // Meta returns: { contacts: [{ input, status, wa_id? }] }
    // status = "valid" | "invalid" | "processing"
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const c of metaData.contacts ?? []) {
      if (c.status === 'valid') {
        valid.push(c.input);
      } else {
        invalid.push(c.input);
      }
    }

    // Any phone not returned in results → treat as valid (unknown)
    const returned = new Set([...valid, ...invalid]);
    for (const p of phones) {
      if (!returned.has(p)) valid.push(p);
    }

    console.log(`[check-whatsapp] Validated ${phones.length} numbers: ${valid.length} valid, ${invalid.length} invalid`);
    return NextResponse.json({ valid, invalid, unsupported: false });
  } catch (err: any) {
    console.error('[check-whatsapp] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
