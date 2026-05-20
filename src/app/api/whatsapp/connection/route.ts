import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ connected: false })

    const { data, error } = await service
      .from('wa_connections')
      .select('id, waba_id, phone_number_id, phone_number, business_name')
      .eq('tenant_id', user.id)
      .single()

    if (error || !data) return NextResponse.json({ connected: false })

    return NextResponse.json({
      connected: true,
      wabaId: data.waba_id,
      phoneNumberId: data.phone_number_id,
      phoneNumber: data.phone_number,
      businessName: data.business_name,
    })

  } catch (err: any) {
    console.error('Connection route error:', err)
    return NextResponse.json({ connected: false })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await service.from('wa_connections').delete().eq('tenant_id', user.id)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
