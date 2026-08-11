export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/contacts/check-whatsapp
 *
 * Strategy (in order):
 *
 * 1. Try Meta BSP contacts check endpoint (Cloud API).
 *    Requires a System User token in META_SYSTEM_TOKEN.
 *    If the account has this capability, we get instant results.
 *
 * 2. If Meta API is unavailable / returns an error, fall back to our
 *    own database: contacts already flagged as `custom4 = 'not_on_whatsapp'`
 *    (populated by the 131026 webhook handler) are "known invalid".
 *    All other numbers are treated as valid — they'll be re-checked
 *    automatically when messages are sent.
 *
 * Body:  { phones: string[] }   — E.164 numbers (max 100 per call)
 * Returns: { valid: string[], invalid: string[], unsupported: boolean }
 *   - unsupported is now always false — we always return a useful answer.
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

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.phone_number_id || !conn?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected.' }, { status: 400 });
    }

    const body = await req.json();
    const phones: string[] = (body.phones || []).slice(0, 100);

    if (phones.length === 0) {
      return NextResponse.json({ valid: [], invalid: [], unsupported: false });
    }

    // ── 1. Attempt Meta BSP contacts check ──────────────────────────────────
    // Requires META_SYSTEM_TOKEN — a permanent System User Access Token
    // with whatsapp_business_messaging permission.
    const systemToken = process.env.META_SYSTEM_TOKEN;
    const phoneNumberId = conn.phone_number_id;

    if (systemToken) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/contacts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${systemToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              blocking: 'wait',
              contacts: phones,       // E.164 format e.g. +919876543210
              force_check: false,
            }),
          }
        );

        const metaData = await metaRes.json();

        if (!metaData.error) {
          // Parse results
          const valid: string[] = [];
          const invalid: string[] = [];
          for (const c of metaData.contacts ?? []) {
            if (c.status === 'valid') valid.push(c.input);
            else invalid.push(c.input);
          }
          // Any phone not returned → treat as valid (unknown)
          const returned = new Set([...valid, ...invalid]);
          for (const p of phones) {
            if (!returned.has(p)) valid.push(p);
          }
          console.log(`[check-whatsapp] Meta API: ${valid.length} valid, ${invalid.length} invalid`);
          return NextResponse.json({ valid, invalid, unsupported: false, source: 'meta_api' });
        }

        // Meta returned an error — log it and fall through to DB fallback
        console.warn(
          `[check-whatsapp] Meta API error (code ${metaData.error?.code}): ${metaData.error?.message}`
        );
      } catch (metaErr: any) {
        console.warn('[check-whatsapp] Meta API fetch failed:', metaErr.message);
      }
    } else {
      console.info('[check-whatsapp] META_SYSTEM_TOKEN not set — using DB fallback.');
    }

    // ── 2. DB fallback: check our known-invalid set ──────────────────────────
    // Contacts marked custom4 = 'not_on_whatsapp' by the 131026 webhook handler
    // are definitively not on WhatsApp. All other numbers are treated as valid
    // and will be re-checked automatically when the first message is sent.

    // Normalise phone list to both +91... and 91... variants so DB lookup works
    const allVariants: string[] = [];
    for (const p of phones) {
      allVariants.push(p);
      if (p.startsWith('+')) allVariants.push(p.slice(1));
      else allVariants.push(`+${p}`);
    }

    const { data: knownInvalid } = await db
      .from('contacts')
      .select('phone')
      .eq('tenant_id', user.id)
      .eq('custom4', 'not_on_whatsapp')
      .in('phone', allVariants);

    const invalidPhones = new Set<string>();
    for (const row of knownInvalid ?? []) {
      // Normalise to E.164 with +
      const norm = row.phone.startsWith('+') ? row.phone : `+${row.phone}`;
      invalidPhones.add(norm);
    }

    const valid: string[] = [];
    const invalid: string[] = [];
    for (const p of phones) {
      const norm = p.startsWith('+') ? p : `+${p}`;
      if (invalidPhones.has(norm)) invalid.push(p);
      else valid.push(p);
    }

    console.log(
      `[check-whatsapp] DB fallback: ${valid.length} valid, ${invalid.length} known-invalid`
    );
    // unsupported: false — we always give a useful answer (even if approximate)
    return NextResponse.json({ valid, invalid, unsupported: false, source: 'db_check' });

  } catch (err: any) {
    console.error('[check-whatsapp] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
