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

    const { code, wabaId, phoneNumberId } = await req.json();

    if (!code || !wabaId || !phoneNumberId) {
      return NextResponse.json({ error: 'Missing code, wabaId, or phoneNumberId' }, { status: 400 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/connect`;

    // Step 1: Exchange auth code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&code=${code}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    const tokenData = await tokenRes.json();
    console.log('OAuth token exchange:', JSON.stringify({ ...tokenData, access_token: '[REDACTED]' }));

    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error.message || 'Token exchange failed' }, { status: 400 });
    }

    const shortToken: string = tokenData.access_token;

    // Step 2: Exchange for 60-day long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&fb_exchange_token=${shortToken}`
    );
    const llData = await llRes.json();
    const longLivedToken: string = llData.access_token || shortToken;
    const expiresIn: number = llData.expires_in ?? 5183944;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    console.log(`Long-lived token obtained. Expires: ${expiresAt}`);

    // Step 3: Fetch phone display info
    let displayPhone = '';
    let businessName = '';
    try {
      const pRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${longLivedToken}`
      );
      const pData = await pRes.json();
      displayPhone = pData.display_phone_number || '';
      businessName = pData.verified_name || '';
    } catch (_) {}

    // Step 4: Save to DB
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { error: dbError } = await db.from('wa_connections').upsert({
      tenant_id: user.id,
      waba_id: wabaId,
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

    return NextResponse.json({ success: true, phoneNumber: displayPhone, businessName });
  } catch (err: any) {
    console.error('oauth-connect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
