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

    let wabaId: string | null = conn.waba_id && !['pending', 'manual'].includes(conn.waba_id)
      ? conn.waba_id : null;

    // If waba_id is 'manual', look up real WABA ID from phone_number_id via Meta API
    if (!wabaId && conn.phone_number_id && conn.phone_number_id !== 'pending') {
      const lookupToken = process.env.META_SYSTEM_TOKEN || conn.access_token;
      try {
        const lookupRes = await fetch(
          `https://graph.facebook.com/v19.0/${conn.phone_number_id}?fields=whatsapp_business_account&access_token=${lookupToken}`
        );
        const lookupData = await lookupRes.json();
        console.log('WABA lookup from phone:', JSON.stringify(lookupData).substring(0, 300));
        if (lookupData?.whatsapp_business_account?.id) {
          wabaId = lookupData.whatsapp_business_account.id;
          // Persist so future calls don't need to look it up again
          await db.from('wa_connections').update({ waba_id: wabaId }).eq('tenant_id', user.id);
          console.log(`Updated waba_id to ${wabaId} for tenant ${user.id}`);
        }
      } catch (e) {
        console.warn('WABA lookup failed:', e);
      }
    }

    if (!wabaId) {
      return NextResponse.json({ error: 'WABA ID not available. Please reconnect.' }, { status: 400 });
    }

    // Use platform System User token if available (works for all WABAs connected to this app).
    // Falls back to tenant's token (works for fresh Embedded Signup connections).
    const subscriptionToken = process.env.META_SYSTEM_TOKEN || conn.access_token;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${subscriptionToken}` },
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
