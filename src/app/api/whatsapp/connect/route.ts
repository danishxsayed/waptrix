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
    console.log('Connect request body:', body)
    
    const { wabaId, phoneNumberId } = body

    if (!wabaId || !phoneNumberId) {
      return NextResponse.json({ 
        error: 'wabaId and phoneNumberId are required',
        received: body
      }, { status: 400 })
    }

    // Get the access token from the FB.login response
    // It should have been stored in the exchange-token step
    // OR get it from the session if using token response type
    const { data: existing } = await supabase
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', user.id)
      .single()

    if (!existing?.access_token) {
      return NextResponse.json({ 
        error: 'No access token found. Please reconnect.' 
      }, { status: 400 })
    }

    // Get phone number details from Meta
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${existing.access_token}`
    )
    const phoneData = await phoneRes.json()
    console.log('Phone data from Meta:', phoneData)

    // Get WABA details
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}?fields=name&access_token=${existing.access_token}`
    )
    const wabaData = await wabaRes.json()
    console.log('WABA data from Meta:', wabaData)

    // Update connection with full details
    const { error: dbError } = await supabase
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: phoneData.display_phone_number || '',
        business_name: wabaData.name || phoneData.verified_name || '',
        access_token: existing.access_token,
      }, { onConflict: 'tenant_id' })

    if (dbError) {
      console.error('DB upsert error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      phoneNumber: phoneData.display_phone_number,
      businessName: wabaData.name
    })

  } catch (err: any) {
    console.error('Connect route error:', err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error' 
    }, { status: 500 })
  }
}

