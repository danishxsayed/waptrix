import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { code } = body

    console.log('Received code:', code)
    console.log('Code type:', typeof code)
    console.log('Code length:', code?.length)

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        error: 'Authorization code is required' 
      }, { status: 400 })
    }

    // Exchange code for token via Meta
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('code', code)

    console.log('Calling Meta token URL:', tokenUrl.toString())

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    console.log('Meta token response:', JSON.stringify(tokenData))

    if (tokenData.error) {
      return NextResponse.json({ 
        error: tokenData.error.message || 'Token exchange failed',
        metaError: tokenData.error
      }, { status: 400 })
    }

    const accessToken = tokenData.access_token
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token received from Meta' 
      }, { status: 400 })
    }

    // Store token temporarily in Supabase
    const { error: dbError } = await supabase
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: 'pending',
        phone_number_id: 'pending',
        access_token: accessToken,
      }, { onConflict: 'tenant_id' })

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Exchange token error:', err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error' 
    }, { status: 500 })
  }
}
