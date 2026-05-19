export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contacts, segment_id } = await request.json();

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'Invalid contacts list' }, { status: 400 });
    }

    const formattedContacts = contacts.map((c: any) => ({
      tenant_id: session.user.id,
      segment_id: segment_id || null,
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || null,
      custom1: c.custom1 || null,
      custom2: c.custom2 || null,
      custom3: c.custom3 || null,
      opted_in: true
    }));

    const { data, error } = await supabase
      .from('contacts')
      .insert(formattedContacts)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
