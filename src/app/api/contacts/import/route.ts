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

    const { contacts } = await request.json();

    const formattedContacts = contacts.map((c: any) => ({
      tenant_id: session.user.id,
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      tags: c.tags || [],
      custom_fields: c.custom_fields || {},
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
