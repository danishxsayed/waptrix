import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await ssrClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Accept wabaId + phoneNumberId directly from the Embedded Signup FINISH event.
    // Now that whatsapp_business_messaging is approved, Meta delivers these reliably.
    const body = await req.json()
    const wabaId: string = body.wabaId || body.waba_id
    const phoneNumberId: string = body.phoneNumberId || body.phone_number_id

    if (!wabaId || !phoneNumberId) {
      return NextResponse.json({
        error: 'Missing wabaId or phoneNumberId from Embedded Signup response.'
      }, { status: 400 })
    }

    // Get the stored access token (saved by store-token after FB.login)
    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', user.id)
      .single()

    if (!conn?.access_token) {
      return NextResponse.json({
        error: 'No access token found. Please reconnect.'
      }, { status: 400 })
    }

    const token = conn.access_token

    // Fetch phone number display details directly using the phoneNumberId from FINISH event.
    // This is the correct approach — no WABA enumeration needed.
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${token}`
    )
    const phoneData = await phoneRes.json()
    console.log('Phone lookup result:', JSON.stringify(phoneData))

    const displayPhone: string = phoneData?.display_phone_number || ''
    const businessName: string = phoneData?.verified_name || ''

    // Upsert with confirmed real values from Meta
    const { error: dbError } = await serviceClient
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: displayPhone,
        business_name: businessName,
        access_token: token,
      }, { onConflict: 'tenant_id' })

    if (dbError) {
      console.error('DB upsert error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumber: displayPhone,
      businessName,
    })

  } catch (err: any) {
    console.error('Connect route error:', err)
    return NextResponse.json({
      error: err.message || 'Internal server error'
    }, { status: 500 })
  }
}
