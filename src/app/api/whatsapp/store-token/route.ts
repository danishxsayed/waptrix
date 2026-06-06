import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Exchange a short-lived FB user token for a long-lived token (~60 days).
 * Called immediately after FB.login so we never store an expiring token.
 */
async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expiresAt: string }> {
  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', process.env.NEXT_PUBLIC_META_APP_ID!)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('fb_exchange_token', shortToken)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) {
    console.warn('Token exchange failed, storing original token:', data.error.message)
    // Fall back to original token — better than nothing
    return {
      token: shortToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h fallback
    }
  }

  const expiresInSeconds: number = data.expires_in ?? 5183944 // ~60 days default
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

  console.log(`Long-lived token obtained. Expires at: ${expiresAt}`)
  return { token: data.access_token, expiresAt }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await ssrClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accessToken } = await req.json()
    if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 400 })

    // Exchange short-lived → long-lived token immediately
    const { token: longLivedToken, expiresAt } = await exchangeForLongLivedToken(accessToken)

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { error } = await db
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: 'pending',
        phone_number_id: 'pending',
        access_token: longLivedToken,
        token_expires_at: expiresAt,
      }, { onConflict: 'tenant_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, expiresAt })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
