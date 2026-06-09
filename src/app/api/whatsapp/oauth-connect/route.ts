export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function exchangeForLongLivedToken(shortToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${shortToken}`
  );
  const data = await res.json();
  return {
    token: data.access_token || shortToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 5183944) * 1000).toISOString(),
  };
}

// Fetch phone details from a WABA — most reliable way to get display_phone_number + verified_name
async function fetchPhoneFromWaba(wabaId: string, token: string): Promise<{
  phoneNumberId: string;
  displayPhone: string;
  businessName: string;
} | null> {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
    );
    const d = await r.json();
    console.log('WABA phone_numbers:', JSON.stringify(d).substring(0, 400));
    const phone = d?.data?.[0];
    if (phone?.id) {
      return {
        phoneNumberId: phone.id,
        displayPhone: phone.display_phone_number || '',
        businessName: phone.verified_name || '',
      };
    }
  } catch (_) {}
  return null;
}

// Auto-detect WABA and phone number from a user access token.
// Tries multiple API paths since permission availability varies.
async function detectWhatsAppAccount(token: string): Promise<{
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string;
  businessName: string;
} | null> {

  // Method 1: me/businesses → whatsapp_business_accounts (needs business_management scope)
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,whatsapp_business_accounts{id,name}&access_token=${token}`
    );
    const d = await r.json();
    console.log('Method1 businesses:', JSON.stringify(d).substring(0, 400));
    const biz = d?.data?.[0];
    const waba = biz?.whatsapp_business_accounts?.data?.[0];
    if (waba?.id) {
      // Use dedicated WABA phone_numbers endpoint — more reliable than nested query
      const phoneDetails = await fetchPhoneFromWaba(waba.id, token);
      if (phoneDetails) {
        return { wabaId: waba.id, ...phoneDetails };
      }
      // WABA found but no phone number yet
      return { wabaId: waba.id, phoneNumberId: '', displayPhone: '', businessName: waba.name || '' };
    }
  } catch (_) {}

  // Method 2: me/whatsapp_business_accounts (needs whatsapp_business_management scope)
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,name&access_token=${token}`
    );
    const d = await r.json();
    console.log('Method2 waba:', JSON.stringify(d).substring(0, 400));
    const waba = d?.data?.[0];
    if (waba?.id) {
      const phoneDetails = await fetchPhoneFromWaba(waba.id, token);
      if (phoneDetails) {
        return { wabaId: waba.id, ...phoneDetails };
      }
      return { wabaId: waba.id, phoneNumberId: '', displayPhone: '', businessName: waba.name || '' };
    }
  } catch (_) {}

  return null;
}

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

    const body = await req.json();
    const { code, wabaId: rawWabaId, phoneNumberId: rawPhoneNumberId } = body;

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/connect`;
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Step 1: Get a short-lived token (from OAuth code or existing DB token)
    let shortToken = '';
    if (code) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
        `&client_secret=${process.env.META_APP_SECRET}` +
        `&code=${code}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();
      console.log('Code exchange:', JSON.stringify({ ...data, access_token: data.access_token ? '[REDACTED]' : undefined }));
      if (data.error) {
        return NextResponse.json({ error: data.error.message || 'Token exchange failed' }, { status: 400 });
      }
      shortToken = data.access_token;
    } else {
      const { data: existing } = await db.from('wa_connections').select('access_token').eq('tenant_id', user.id).single();
      if (!existing?.access_token) {
        return NextResponse.json({ error: 'No token. Please reconnect via Facebook first.' }, { status: 400 });
      }
      shortToken = existing.access_token;
    }

    // Step 2: Exchange for 60-day long-lived token
    const { token: longLivedToken, expiresAt } = await exchangeForLongLivedToken(shortToken);
    console.log(`Long-lived token. Expires: ${expiresAt}`);

    // Step 3: Resolve WABA + phone number ID
    let wabaId = rawWabaId && !['from-phone-id', 'pending', 'manual'].includes(rawWabaId) ? rawWabaId : '';
    let phoneNumberId = rawPhoneNumberId && !['pending'].includes(rawPhoneNumberId) ? rawPhoneNumberId : '';
    let displayPhone = '';
    let businessName = '';

    if (!wabaId || !phoneNumberId) {
      // Auto-detect via API
      const detected = await detectWhatsAppAccount(longLivedToken);
      if (detected) {
        wabaId = detected.wabaId;
        phoneNumberId = detected.phoneNumberId;
        displayPhone = detected.displayPhone;
        businessName = detected.businessName;
        console.log('Auto-detected:', { wabaId, phoneNumberId, displayPhone, businessName });
      }
    }

    // If we have wabaId but still need phone details, try WABA endpoint
    if (wabaId && (!phoneNumberId || !displayPhone)) {
      const phoneDetails = await fetchPhoneFromWaba(wabaId, longLivedToken);
      if (phoneDetails) {
        if (!phoneNumberId) phoneNumberId = phoneDetails.phoneNumberId;
        if (!displayPhone) displayPhone = phoneDetails.displayPhone;
        if (!businessName) businessName = phoneDetails.businessName;
      }
    }

    // If we have phoneNumberId but still need display info, try direct phone lookup
    if (phoneNumberId && (!displayPhone || !businessName)) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,whatsapp_business_account&access_token=${longLivedToken}`
        );
        const d = await r.json();
        console.log('Phone detail lookup:', JSON.stringify(d));
        if (!displayPhone) displayPhone = d.display_phone_number || '';
        if (!businessName) businessName = d.verified_name || '';
        if (!wabaId && d.whatsapp_business_account?.id) {
          wabaId = d.whatsapp_business_account.id;
        }
      } catch (_) {}
    }

    if (!phoneNumberId) {
      // Auto-detect failed — check if tenant already has a valid connection in DB
      const { data: existing } = await db
        .from('wa_connections')
        .select('waba_id, phone_number_id, phone_number, business_name')
        .eq('tenant_id', user.id)
        .single();

      const existingPhoneId = existing?.phone_number_id && existing.phone_number_id !== 'pending'
        ? existing.phone_number_id : null;

      if (existingPhoneId) {
        // Tenant already has a valid phone number ID — just refresh the token
        console.log('Auto-detect failed but existing connection found — refreshing token only');
        await db.from('wa_connections').update({
          access_token: longLivedToken,
          token_expires_at: expiresAt,
        }).eq('tenant_id', user.id);

        return NextResponse.json({
          success: true,
          phoneNumber: existing.phone_number || '',
          businessName: existing.business_name || '',
        });
      }

      // No existing connection — save token and ask for manual entry
      await db.from('wa_connections').upsert({
        tenant_id: user.id,
        waba_id: wabaId || 'manual',
        phone_number_id: 'pending',
        phone_number: '',
        business_name: businessName,
        access_token: longLivedToken,
        token_expires_at: expiresAt,
      }, { onConflict: 'tenant_id' });

      return NextResponse.json({
        error: 'auto-detect-failed',
        tokenSaved: true,
        message: 'Could not auto-detect phone number. Please enter it manually.'
      }, { status: 422 });
    }

    // Step 4: Save to DB
    const { error: dbError } = await db.from('wa_connections').upsert({
      tenant_id: user.id,
      waba_id: wabaId || 'manual',
      phone_number_id: phoneNumberId,
      phone_number: displayPhone,
      business_name: businessName,
      access_token: longLivedToken,
      token_expires_at: expiresAt,
    }, { onConflict: 'tenant_id' });

    if (dbError) {
      console.error('DB upsert error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Auto-subscribe WABA to this app's webhook so Meta delivers events.
    // Uses META_SYSTEM_TOKEN (platform-level) if available — otherwise falls back
    // to the user's token (works when coming from a fresh Embedded Signup).
    if (wabaId && wabaId !== 'manual') {
      try {
        const subscriptionToken = process.env.META_SYSTEM_TOKEN || longLivedToken;
        const subRes = await fetch(
          `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
          { method: 'POST', headers: { Authorization: `Bearer ${subscriptionToken}` } }
        );
        const subData = await subRes.json();
        console.log('WABA webhook subscription:', JSON.stringify(subData));
      } catch (e) {
        console.warn('WABA webhook subscription failed (non-fatal):', e);
      }
    }

    return NextResponse.json({ success: true, phoneNumber: displayPhone, businessName });
  } catch (err: any) {
    console.error('oauth-connect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
