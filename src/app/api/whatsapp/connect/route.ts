export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    // Exchange code for access token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&code=${code}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/connect`
    );

    const accessToken = tokenResponse.data.access_token;

    // Get WABA details
    const debugResponse = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
    );

    const wabaId = debugResponse.data.data.target_ids?.[0]; // Simplified

    // Save connection
    const { data, error } = await supabase
      .from('wa_connections')
      .upsert({
        tenant_id: session.user.id,
        waba_id: wabaId,
        access_token: accessToken,
        status: 'CONNECTED',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data?.error?.message || err.message }, { status: 500 });
  }
}
