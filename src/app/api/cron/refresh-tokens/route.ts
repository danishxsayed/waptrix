export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Refresh a long-lived token by exchanging it for another long-lived token.
 * Meta allows this as long as the current token is still valid.
 */
async function refreshToken(currentToken: string): Promise<{ token: string; expiresAt: string } | null> {
  try {
    const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', process.env.NEXT_PUBLIC_META_APP_ID!)
    url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    url.searchParams.set('fb_exchange_token', currentToken)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.error) {
      console.error('Token refresh failed:', data.error.message)
      return null
    }

    const expiresInSeconds: number = data.expires_in ?? 5183944
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    return { token: data.access_token, expiresAt }
  } catch (err: any) {
    console.error('Token refresh error:', err.message)
    return null
  }
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Find connections whose token expires within the next 10 days
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

    const { data: connections, error } = await db
      .from('wa_connections')
      .select('tenant_id, access_token, token_expires_at')
      .or(`token_expires_at.is.null,token_expires_at.lte.${tenDaysFromNow}`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: 'All tokens are fresh. Nothing to refresh.' })
    }

    let refreshed = 0
    let failed = 0

    for (const conn of connections) {
      const result = await refreshToken(conn.access_token)

      if (result) {
        await db
          .from('wa_connections')
          .update({
            access_token: result.token,
            token_expires_at: result.expiresAt,
          })
          .eq('tenant_id', conn.tenant_id)

        console.log(`Refreshed token for tenant ${conn.tenant_id}. New expiry: ${result.expiresAt}`)
        refreshed++
      } else {
        console.error(`Failed to refresh token for tenant ${conn.tenant_id}`)
        failed++
      }
    }

    return NextResponse.json({
      message: `Processed ${connections.length} connections.`,
      refreshed,
      failed,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
