export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('*, template:templates(*), segment:contact_segments(*)')
      .eq('tenant_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      template_id, 
      segment_id, 
      variable_mapping, 
      send_now, 
      scheduled_at, 
      status 
    } = body;

    // Handle immediate launches: auto-set to 'queued' with current time
    const finalStatus = send_now || !scheduled_at ? 'queued' : (status || 'queued');
    const finalScheduledAt = send_now || !scheduled_at ? new Date().toISOString() : scheduled_at;

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: session.user.id,
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
