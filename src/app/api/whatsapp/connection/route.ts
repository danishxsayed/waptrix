import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()

    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await ssrClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('wa_connections')
      .select('waba_id, phone_number_id, phone_number, business_name, access_token')
      .eq('tenant_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ connected: false })
    }

    let phoneNumber = data.phone_number || ''
    let businessName = data.business_name || ''

    // Backfill missing display fields from Meta API on the fly
    if ((!phoneNumber || !businessName) && data.phone_number_id && data.phone_number_id !== 'pending') {
      try {
        const token = process.env.META_SYSTEM_TOKEN || data.access_token
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${data.phone_number_id}?fields=display_phone_number,verified_name&access_token=${token}`
        )
        const d = await r.json()
        if (d.display_phone_number || d.verified_name) {
          if (!phoneNumber) phoneNumber = d.display_phone_number || ''
          if (!businessName) businessName = d.verified_name || ''
          // Persist so next load is instant
          await serviceClient
            .from('wa_connections')
            .update({ phone_number: phoneNumber, business_name: businessName })
            .eq('tenant_id', user.id)
        }
      } catch (_) {}
    }

    return NextResponse.json({
      connected: true,
      wabaId: data.waba_id,
      phoneNumberId: data.phone_number_id,
      phoneNumber,
      businessName,
    })

  } catch (err: any) {
    console.error('Connection GET error:', err.message)
    return NextResponse.json({ connected: false })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()

    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await ssrClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    await serviceClient.from('wa_connections').delete().eq('tenant_id', user.id)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
