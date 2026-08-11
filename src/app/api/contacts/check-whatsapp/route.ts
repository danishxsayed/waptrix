export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/contacts/check-whatsapp
 *
 * Checks whether phone numbers are registered on WhatsApp using Meta's
 * contacts validation endpoint. Tries tokens in order:
 *   1. META_SYSTEM_TOKEN (System User token — best permissions)
 *   2. conn.access_token (tenant OAuth token — works if app has whatsapp_business_messaging)
 *
 * If both fail, returns:
 *   { valid: [], invalid: [], apiAvailable: false }
 * so the UI can warn the user clearly instead of silently passing all numbers.
 *
 * Body:  { phones: string[] }   — E.164 numbers (max 100 per call)
 * Returns:
 *   { valid, invalid, apiAvailable: boolean, source: 'meta_api' | 'db_check' | 'unavailable' }
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
      return NextResponse.json({ valid: [], invalid: [], apiAvailable: true, source: 'meta_api' });
    }

    const phoneNumberId = conn.phone_number_id;

    // ── 1. Attempt Meta BSP contacts check (try multiple tokens) ────────────
    // Token priority: System User token (permanent, best) → OAuth user token
    const tokens: string[] = [];
    if (process.env.META_SYSTEM_TOKEN) tokens.push(process.env.META_SYSTEM_TOKEN);
    if (conn.access_token) tokens.push(conn.access_token);

    let lastMetaError: { code: number; message: string; type?: string } | null = null;

    for (const token of tokens) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/contacts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              blocking: 'wait',
              contacts: phones,        // E.164 format: +91XXXXXXXXXX
              force_check: false,
            }),
          }
        );

        const metaData = await metaRes.json();

        if (!metaData.error) {
          // ✅ Meta API worked — parse results
          const valid: string[] = [];
          const invalid: string[] = [];

          for (const c of metaData.contacts ?? []) {
            if (c.status === 'valid') valid.push(c.input);
            else invalid.push(c.input);
          }

          // Phones not in response → treat as valid (unknown status)
          const returned = new Set([...valid, ...invalid]);
          for (const p of phones) {
            if (!returned.has(p)) valid.push(p);
          }

          console.log(
            `[check-whatsapp] Meta API success: ${valid.length} valid, ${invalid.length} invalid`
          );
          return NextResponse.json({ valid, invalid, apiAvailable: true, source: 'meta_api' });
        }

        lastMetaError = {
          code: metaData.error?.code,
          message: metaData.error?.message ?? 'Unknown error',
          type: metaData.error?.type,
        };
        console.warn(
          `[check-whatsapp] Meta API error — code ${lastMetaError.code} (${lastMetaError.type}): ${lastMetaError.message}`
        );

        // Token-expired/revoked (190) → try next token
        // All other errors: problem isn't the token, no point retrying
        if (lastMetaError.code !== 190) break;

      } catch (fetchErr: any) {
        console.warn('[check-whatsapp] Fetch error:', fetchErr.message);
        lastMetaError = { code: 0, message: fetchErr.message };
      }
    }

    // ── 2. Meta API unavailable — fall back to DB of known-invalid numbers ──
    // Contacts previously identified as not_on_whatsapp (via 131026 webhook)
    // are in our DB. All other numbers are unknown — cannot validate without API.
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

    const invalidPhoneSet = new Set<string>();
    for (const row of knownInvalid ?? []) {
      const norm = row.phone.startsWith('+') ? row.phone : `+${row.phone}`;
      invalidPhoneSet.add(norm);
    }

    const dbValid: string[]   = [];
    const dbInvalid: string[] = [];
    for (const p of phones) {
      const norm = p.startsWith('+') ? p : `+${p}`;
      if (invalidPhoneSet.has(norm)) dbInvalid.push(p);
      else dbValid.push(p);
    }

    const hasKnownInvalid = dbInvalid.length > 0;
    console.log(
      `[check-whatsapp] DB fallback: ${dbValid.length} valid, ${dbInvalid.length} known-invalid`
    );

    // apiAvailable: false signals the UI to warn the user that real-time
    // validation didn't run — only previously-identified invalids were caught.
    return NextResponse.json({
      valid: dbValid,
      invalid: dbInvalid,
      apiAvailable: false,
      source: hasKnownInvalid ? 'db_check' : 'unavailable',
      // Expose the Meta error so the UI can show it for debugging
      metaError: lastMetaError,
    });

  } catch (err: any) {
    console.error('[check-whatsapp] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
