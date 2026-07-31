export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Subscribes the tenant's WABA to this app's webhook.
// Must be called once after connection — without this Meta won't send webhook events.
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

    // Accept optional manual WABA ID override from the request body
    let manualWabaId: string | null = null;
    try {
      const body = await req.json();
      manualWabaId = body?.wabaId || null;
    } catch (_) {}

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, waba_id, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    const phoneNumberId = conn.phone_number_id && conn.phone_number_id !== 'pending'
      ? conn.phone_number_id : null;

    // Use manual override if provided
    let wabaId: string | null = manualWabaId || null;

    // Otherwise use DB value — but only if it doesn't look like a phone number ID
    // (phone number IDs and WABA IDs are both long numbers; if waba_id === phone_number_id, it's wrong)
    if (!wabaId) {
      const dbWaba = conn.waba_id;
      const isValidWaba = dbWaba
        && !['pending', 'manual'].includes(dbWaba)
        && dbWaba !== phoneNumberId; // guard against phone_number_id stored in waba_id column
      wabaId = isValidWaba ? dbWaba : null;
    }

    // Auto-detect WABA from phone number ID using phone lookup
    if (!wabaId && phoneNumberId) {
      const lookupToken = process.env.META_SYSTEM_TOKEN || conn.access_token;
      try {
        const lookupRes = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=whatsapp_business_account&access_token=${lookupToken}`
        );
        const lookupData = await lookupRes.json();
        console.log('WABA lookup from phone:', JSON.stringify(lookupData).substring(0, 300));
        const detectedId = lookupData?.whatsapp_business_account?.id;
        // Only use if different from phone_number_id (avoid bad API response)
        if (detectedId && detectedId !== phoneNumberId) {
          wabaId = detectedId;
          await db.from('wa_connections').update({ waba_id: wabaId }).eq('tenant_id', user.id);
          console.log(`Resolved and saved waba_id: ${wabaId}`);
        } else if (detectedId === phoneNumberId) {
          console.warn('API returned phone_number_id as WABA ID — ignoring');
        }
      } catch (e) {
        console.warn('WABA lookup failed:', e);
      }
    }

    if (!wabaId) {
      return NextResponse.json({
        error: 'needs-waba-id',
        message: 'Could not auto-detect WABA ID. Please enter it manually.',
      }, { status: 422 });
    }

    // If we got a manual override, save it to DB
    if (manualWabaId && manualWabaId !== conn.waba_id) {
      await db.from('wa_connections').update({ waba_id: manualWabaId }).eq('tenant_id', user.id);
      console.log(`Saved manual waba_id: ${manualWabaId}`);
    }

    // Try system token first (works when system user has been added to the WABA).
    // Fall back to the user's own token (always works for their own WABA from Embedded Signup).
    const tokensToTry = Array.from(new Set([
      process.env.META_SYSTEM_TOKEN,
      conn.access_token,
    ].filter(Boolean))) as string[];

    let lastError = 'Subscription failed';
    for (const subscriptionToken of tokensToTry) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
        { method: 'POST', headers: { Authorization: `Bearer ${subscriptionToken}` } }
      );
      const data = await res.json();
      console.log('WABA webhook subscription attempt:', JSON.stringify(data).substring(0, 200));

      if (res.ok) {
        return NextResponse.json({ success: true });
      }

      lastError = data.error?.message || 'Subscription failed';
      // Only retry on permission/auth errors, not on 4xx client errors
      const errCode = data.error?.code;
      const isPermissionError = errCode === 200 || errCode === 190 || errCode === 10 || errCode === 803;
      if (!isPermissionError) break; // Don't retry on non-permission errors
    }

    return NextResponse.json({ error: lastError }, { status: 400 });
  } catch (err: any) {
    console.error('subscribe-webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
