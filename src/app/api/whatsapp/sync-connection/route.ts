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

    // Fetch the stored connection — may already have phone_number_id from the FINISH event
    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, waba_id, phone_number_id')
      .eq('tenant_id', user.id)
      .single()

    if (!conn?.access_token) {
      return NextResponse.json({
        error: 'No access token found. Please reconnect.'
      }, { status: 400 })
    }

    const token = conn.access_token

    // If we already have a real phone_number_id (not 'pending'), use it directly
    if (conn.phone_number_id && conn.phone_number_id !== 'pending') {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v19.0/${conn.phone_number_id}?fields=id,display_phone_number,verified_name&access_token=${token}`
      )
      const phoneData = await phoneRes.json()
      console.log('Direct phone lookup:', JSON.stringify(phoneData))

      if (phoneData?.display_phone_number) {
        const { error: dbError } = await serviceClient
          .from('wa_connections')
          .upsert({
            tenant_id: user.id,
            waba_id: conn.waba_id,
            phone_number_id: conn.phone_number_id,
            phone_number: phoneData.display_phone_number,
            business_name: phoneData.verified_name || '',
            access_token: token,
          }, { onConflict: 'tenant_id' })

        if (dbError) {
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          phoneNumber: phoneData.display_phone_number,
          businessName: phoneData.verified_name || '',
        })
      }
    }

    // Fallback: enumerate WABAs from the user token
    // Used when the FINISH event did not fire (e.g., user previously connected)
    const wabaListRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${token}`
    )
    const wabaList = await wabaListRes.json()
    console.log('WABA list:', JSON.stringify(wabaList))

    const waba = wabaList?.data?.[0]
    if (!waba?.id) {
      return NextResponse.json({
        error: 'No WhatsApp Business Account found. Complete the Embedded Signup first.',
      }, { status: 400 })
    }

    const phonesRes = await fetch(
      `https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
    )
    const phonesData = await phonesRes.json()
    console.log('Phones:', JSON.stringify(phonesData))
    const phone = phonesData?.data?.[0]

    const { error: dbError } = await serviceClient
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: waba.id,
        phone_number_id: phone?.id || 'pending',
        phone_number: phone?.display_phone_number || '',
        business_name: waba.name || phone?.verified_name || '',
        access_token: token,
      }, { onConflict: 'tenant_id' })

    if (dbError) {
      console.error('DB upsert error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phone?.display_phone_number || '',
      businessName: waba.name || '',
    })

  } catch (err: any) {
    console.error('Sync connection route error:', err)
    return NextResponse.json({
      error: err.message || 'Internal server error'
    }, { status: 500 })
  }
}
