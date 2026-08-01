export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Sends a verification OTP to the phone number via SMS or Voice.
 * Required when the number is currently active on personal WhatsApp
 * and needs to be migrated to Cloud API.
 *
 * Meta API: POST /{phone-number-id}/request_code
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

    const { codeMethod = 'SMS' } = await req.json().catch(() => ({}));

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.phone_number_id || conn.phone_number_id === 'pending') {
      return NextResponse.json({ error: 'No WhatsApp phone number found' }, { status: 404 });
    }

    // Try both tokens
    const tokensToTry = Array.from(new Set([
      process.env.META_SYSTEM_TOKEN,
      conn.access_token,
    ].filter(Boolean))) as string[];

    let lastError = 'Failed to send verification code';
    for (const token of tokensToTry) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${conn.phone_number_id}/request_code`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code_method: codeMethod, language: 'en_US' }),
        }
      );
      const data = await res.json();
      console.log('Request verification code:', JSON.stringify(data));

      if (res.ok) return NextResponse.json({ success: true });

      lastError = data.error?.message || lastError;
      const errCode = data.error?.code;
      if (errCode !== 190 && errCode !== 200 && errCode !== 10) break;
    }

    return NextResponse.json({ error: lastError }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
