export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await db
    .from('wa_connections')
    .select('*')
    .eq('tenant_id', user.id)
    .single();

  return NextResponse.json({
    userId: user.id,
    row: data ? {
      tenant_id: data.tenant_id,
      waba_id: data.waba_id,
      phone_number_id: data.phone_number_id,
      phone_number: data.phone_number,
      business_name: data.business_name,
      has_token: !!data.access_token,
      token_expires_at: data.token_expires_at,
    } : null,
    error: error?.message,
  });
}
