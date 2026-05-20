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

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Get the access token from the FB.login response
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

    // Try multiple endpoints to find the WABA
    const token = conn.access_token

    // Method 1: Get WABAs directly
    const wabaListRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${token}`
    )
    const wabaList = await wabaListRes.json()
    console.log('WABA list:', JSON.stringify(wabaList))

    let waba = wabaList?.data?.[0]
    let phone = null

    if (waba) {
      // Get phone numbers for this WABA
      const phonesRes = await fetch(
        `https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
      )
      const phonesData = await phonesRes.json()
      console.log('Phones:', JSON.stringify(phonesData))
      phone = phonesData?.data?.[0]
    }

    let bizData: any = null

    // Method 2: Try businesses endpoint if method 1 fails  
    if (!waba) {
      const bizRes = await fetch(
        `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${token}`
      )
      bizData = await bizRes.json()
      console.log('Businesses:', JSON.stringify(bizData))
      waba = bizData?.data?.[0]?.whatsapp_business_accounts?.data?.[0]
      phone = waba?.phone_numbers?.data?.[0]
    }

    if (!waba?.id) {
      // Log what we got for debugging
      const debugInfo = {
        wabaListResponse: wabaList,
        bizResponse: bizData,
        tokenPrefix: token.substring(0, 30)
      }
      console.log('DEBUG - full Meta responses:', JSON.stringify(debugInfo))

      return NextResponse.json({ 
        error: 'No WhatsApp Business Account found. Make sure the Facebook account has a WABA.',
        debug: debugInfo
      }, { status: 400 })
    }

    // Update connection with full details
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
      businessName: waba.name
    })

  } catch (err: any) {
    console.error('Connect connection route error:', err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error' 
    }, { status: 500 })
  }
}
