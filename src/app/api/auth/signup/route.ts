export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const body = await request.json();
    const { email, password, name, company } = body;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company: company
        }
      }
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    if (authData.user) {
      const { error: tenantError } = await supabase.from('tenants').insert({
        id: authData.user.id,
        name,
        email,
        company,
      });

      if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 400 });
    }

    return NextResponse.json({ user: authData.user, session: authData.session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
