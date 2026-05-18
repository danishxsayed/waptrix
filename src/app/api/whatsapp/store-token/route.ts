import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accessToken } = await req.json()
    if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 400 })

    const { error } = await supabase
      .from('wa_connections')
      .upsert({
        tenant_id: user.id,
        waba_id: 'pending',
        phone_number_id: 'pending',
        access_token: accessToken,
      }, { onConflict: 'tenant_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
