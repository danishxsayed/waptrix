export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/test-send
 *
 * Diagnostic endpoint — sends a single template message to a test number
 * and returns the exact Meta API response (success or error).
 * Used to diagnose delivery failures without running a full campaign.
 *
 * Body: { phone: string, templateName: string, languageCode?: string }
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, templateName, languageCode = 'en_US' } = await req.json();
    if (!phone || !templateName) {
      return NextResponse.json({ error: 'phone and templateName are required' }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: waConn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id, waba_id')
      .eq('tenant_id', user.id)
      .single();

    if (!waConn?.access_token || !waConn?.phone_number_id) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 400 });
    }

    // Normalize phone — strip all non-digits
    const digitsOnly = (phone || '').replace(/\D/g, '');
    const normalizedTemplateName = templateName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                digitsOnly,
      type:              'template',
      template: {
        name:     normalizedTemplateName,
        language: { code: languageCode },
      },
    };

    const results: { token: string; response: any; ok: boolean }[] = [];

    // Try system token first if available
    const tokens: { label: string; token: string }[] = [];
    if (process.env.META_SYSTEM_TOKEN) tokens.push({ label: 'system_token', token: process.env.META_SYSTEM_TOKEN });
    tokens.push({ label: 'tenant_token', token: waConn.access_token });

    for (const { label, token } of tokens) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${waConn.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      results.push({ token: label, response: data, ok: !data.error });

      // If one token succeeded, stop — no need to try the other
      if (!data.error) break;
    }

    const success = results.find(r => r.ok);
    const lastResult = results[results.length - 1];

    return NextResponse.json({
      phone_sent_to:  `+${digitsOnly}`,
      template_name:  normalizedTemplateName,
      language:       languageCode,
      phone_number_id: waConn.phone_number_id,
      success: !!success,
      results,
      // If all tokens failed, surface the error clearly
      error: success ? null : lastResult?.response?.error ?? 'Unknown error',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
