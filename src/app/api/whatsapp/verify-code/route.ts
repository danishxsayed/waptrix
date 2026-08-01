export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Verifies the OTP and then registers the phone with Cloud API.
 * This completes the migration from personal WhatsApp to Cloud API.
 *
 * Meta API: POST /{phone-number-id}/verify_code → then POST /{phone-number-id}/register
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

    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code you received' }, { status: 400 });
    }

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id, registration_pin')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.phone_number_id || conn.phone_number_id === 'pending') {
      return NextResponse.json({ error: 'No WhatsApp phone number found' }, { status: 404 });
    }

    const tokensToTry = Array.from(new Set([
      process.env.META_SYSTEM_TOKEN,
      conn.access_token,
    ].filter(Boolean))) as string[];

    // Step 1: Verify the OTP
    let verifyError = 'Verification failed';
    let verifyOk = false;
    for (const token of tokensToTry) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${conn.phone_number_id}/verify_code`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }
      );
      const data = await res.json();
      console.log('Verify code:', JSON.stringify(data));
      if (res.ok) { verifyOk = true; break; }
      verifyError = data.error?.message || verifyError;
      const errCode = data.error?.code;
      if (errCode !== 190 && errCode !== 200 && errCode !== 10) break;
    }

    if (!verifyOk) {
      return NextResponse.json({ error: verifyError }, { status: 400 });
    }

    // Step 2: Register the phone (now that OTP is verified, personal WhatsApp is deactivated)
    const pin = conn.registration_pin || String(Math.floor(100000 + Math.random() * 900000));
    await db.from('wa_connections').update({ registration_pin: pin }).eq('tenant_id', user.id);

    let registerError = 'Verification succeeded but registration failed. Please try Register Phone Number Now.';
    for (const token of tokensToTry) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${conn.phone_number_id}/register`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
        }
      );
      const data = await res.json();
      console.log('Register after verify:', JSON.stringify(data));
      if (res.ok) return NextResponse.json({ success: true });
      registerError = data.error?.message || registerError;
      const errCode = data.error?.code;
      if (errCode !== 190 && errCode !== 200 && errCode !== 10) break;
    }

    return NextResponse.json({ error: registerError }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
