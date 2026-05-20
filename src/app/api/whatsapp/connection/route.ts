import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Use getUser instead of getSession - more reliable
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth user:', user?.id, authError?.message)
    
    if (!user) {
      return NextResponse.json({ connected: false })
    }

    // Use service role client to bypass RLS
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('wa_connections')
      .select('id, waba_id, phone_number_id, phone_number, business_name, connected_at')
      .eq('tenant_id', user.id)
      .single()

    console.log('Connection data:', data, error?.message)

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
    console.error('Connection route error:', err)
    return NextResponse.json({ connected: false })
  }
}
