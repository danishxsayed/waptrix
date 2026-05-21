import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ connected: false })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('wa_connections')
      .select('*')
      .eq('tenant_id', session.user.id)
      .single()

    if (error || !data) {
      console.log('No connection found for user:', session.user.id, error?.message)
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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    await serviceClient
      .from('wa_connections')
      .delete()
      .eq('tenant_id', session.user.id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Connection DELETE error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
