export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    const { contacts, segment_id } = await request.json();

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'Invalid contacts list' }, { status: 400 });
    }

    // Deduplicate by phone — last row wins (same behaviour as the instructions say)
    const phoneMap = new Map<string, any>();
    for (const c of contacts) {
      const key = (c.phone || '').trim();
      if (key) phoneMap.set(key, c);
    }

    const formattedContacts = Array.from(phoneMap.values()).map((c: any) => ({
      tenant_id: user.id,
      segment_id: segment_id || null,
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || null,
      custom1: c.custom1 || null,
      custom2: c.custom2 || null,
      custom3: c.custom3 || null,
      opted_in: c.opted_in !== undefined ? c.opted_in : true
    }));

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await serviceClient
      .from('contacts')
      .upsert(formattedContacts, { onConflict: 'tenant_id,phone' })
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
