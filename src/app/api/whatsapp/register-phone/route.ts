export const dynamic = "force-dynamic";

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
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id, registration_pin')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token || !conn?.phone_number_id || conn.phone_number_id === 'pending') {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    // Use provided PIN → stored PIN → auto-generate one (no user input required)
    let pin: string = body.pin || conn.registration_pin || '';
    if (!pin || !/^\d{6}$/.test(pin)) {
      pin = String(Math.floor(100000 + Math.random() * 900000));
    }

    // Persist the PIN so future re-registrations are also automatic
    if (pin !== conn.registration_pin) {
      await db.from('wa_connections').update({ registration_pin: pin }).eq('tenant_id', user.id);
    }

    // Try system token first, then user token — system token has admin access to WABAs
    const tokensToTry = Array.from(new Set([
      process.env.META_SYSTEM_TOKEN,
      conn.access_token,
    ].filter(Boolean))) as string[];

    let lastErrMsg = 'Registration failed';
    let lastErrCode: number | undefined;

    for (const regToken of tokensToTry) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${conn.phone_number_id}/register`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${regToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
        }
      );

      const data = await res.json();
      console.log('Phone registration response:', JSON.stringify(data));

      if (res.ok) {
        return NextResponse.json({ success: true });
      }

      lastErrCode = data.error?.code;
      const rawMsg: string = data.error?.message || 'Registration failed';

      // Translate cryptic Meta errors into actionable messages
      if (rawMsg.includes('does not exist') || rawMsg.includes('missing permissions') || rawMsg.includes('Unsupported post')) {
        lastErrMsg = 'This phone number ID is invalid or your app does not have permission to register it. ' +
          'Please disconnect and reconnect via "Connect WhatsApp Business" to refresh your credentials.';
      } else if (rawMsg.toLowerCase().includes('already registered') || lastErrCode === 2388053) {
        lastErrMsg = 'This number is already registered — no action needed. Try refreshing the page.';
      } else if (rawMsg.toLowerCase().includes('migrate') || lastErrCode === 2388052) {
        lastErrMsg = 'This phone number is currently on personal WhatsApp or another provider. ' +
          'You must first migrate it in WhatsApp Manager: go to Meta Business Settings → WhatsApp Manager → Migrate Number.';
      } else {
        lastErrMsg = rawMsg;
      }

      // Only retry on permission errors, not on structural errors
      if (lastErrCode !== 190 && lastErrCode !== 200 && lastErrCode !== 10) break;
    }

    return NextResponse.json({ error: lastErrMsg, code: lastErrCode }, { status: 400 });
  } catch (err: any) {
    console.error('register-phone error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
