export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'


import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await ssrClient.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('campaigns')
      .select('*, template:templates(*), segment:segments(*)')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getUser() {
  const cookieStore = await cookies()
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await ssrClient.auth.getUser()
  return user
}

export async function POST(req: Request) {
  try {
    console.log('Campaign POST started')
    
    const user = await getUser()
    console.log('User:', user?.id)
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any = {}
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    
    console.log('Body received:', JSON.stringify(body))
    
    // Support both camelCase and snake_case for maximum compatibility
    const name = body.name
    const templateId = body.templateId || body.template_id
    const segmentId = body.segmentId || body.segment_id
    
    if (!name) return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    if (!templateId) return NextResponse.json({ error: 'Template is required' }, { status: 400 })
    if (!segmentId) return NextResponse.json({ error: 'Segment/audience is required' }, { status: 400 })

    // rest of the existing code continues...
    const { 
      variable_mapping, 
      send_now, 
      scheduled_at, 
      status 
    } = body;

    const template_id = templateId;
    const segment_id = segmentId;

    // Handle immediate launches: auto-set to 'queued' with current time
    const finalStatus = send_now || !scheduled_at ? 'queued' : (status || 'queued');
    const finalScheduledAt = send_now || !scheduled_at ? new Date().toISOString() : scheduled_at;

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('campaigns')
      .insert({
        tenant_id: user.id,
        name,
        template_id,
        segment_id,
        variable_mapping: variable_mapping || {},
        scheduled_at: finalScheduledAt,
        status: finalStatus,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
