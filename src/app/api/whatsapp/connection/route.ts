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
      .select('waba_id, phone_number_id, phone_number, business_name')
      .eq('tenant_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      wabaId: data.waba_id,
      phoneNumberId: data.phone_number_id,
      phoneNumber: data.phone_number,
      businessName: data.business_name,
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
