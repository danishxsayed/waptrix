export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pin } = await req.json();
    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'A 6-digit PIN is required' }, { status: 400 });
    }

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token || !conn?.phone_number_id || conn.phone_number_id === 'pending') {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    // Call Meta registration API
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${conn.phone_number_id}/register`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin,
        }),
      }
    );

    const data = await res.json();
    console.log('Phone registration response:', JSON.stringify(data));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Registration failed', code: data.error?.code },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('register-phone error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
