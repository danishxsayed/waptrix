export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Subscribes the tenant's WABA to this app's webhook.
// Must be called once after connection — without this Meta won't send webhook events.
export async function POST() {
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
      .select('access_token, waba_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    const wabaId = conn.waba_id && !['pending', 'manual'].includes(conn.waba_id)
      ? conn.waba_id : null;

    if (!wabaId) {
      return NextResponse.json({ error: 'WABA ID not available. Please reconnect.' }, { status: 400 });
    }

    // Subscribe WABA to this app's webhook
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.access_token}` },
      }
    );

    const data = await res.json();
    console.log('WABA webhook subscription:', JSON.stringify(data));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Subscription failed' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('subscribe-webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
