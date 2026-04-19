import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, company } = await request.json();

    // 1. Update Auth Metadata
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        company: company
      }
    });

    if (updateAuthError) {
      return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
    }

    // 2. Update Tenants Table
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        name,
        company,
      })
      .eq('id', user.id);

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
