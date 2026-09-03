export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getEffectiveTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const tenantId = await getEffectiveTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Your workspace could not be found. Please contact support.' }, { status: 400 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const tenantId = await getEffectiveTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Your workspace could not be found. Please contact support.' }, { status: 400 });
    }

    const body = await req.json();
    const { 
      name, 
      category, 
      language, 
      header_type, 
      header_text, 
      header_image_url, 
      body: templateBody, 
      footer, 
      buttons 
    } = body;

    // Strip base64 data URLs before saving — they cause DB statement timeouts.
    const rawHeaderValue = header_type === 'TEXT' ? header_text : header_image_url;
    const resolvedHeaderText = (rawHeaderValue && rawHeaderValue.startsWith('data:')) ? '' : (rawHeaderValue || '');

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('templates')
      .update({
        name,
        category: category || 'MARKETING',
        language: language || 'en_US',
        header_type: header_type || 'NONE',
        header_text: resolvedHeaderText || '',
        body: templateBody || '',
        footer: footer || '',
        buttons: buttons || [],
        meta_status: 'DRAFT'
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const tenantId = await getEffectiveTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Your workspace could not be found. Please contact support.' }, { status: 400 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Check if any campaigns reference this template before deleting
    const { count: campaignCount } = await serviceClient
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)
      .eq('tenant_id', tenantId);

    if (campaignCount && campaignCount > 0) {
      return NextResponse.json({
        error: `This template is used in ${campaignCount} campaign${campaignCount > 1 ? 's' : ''}. Delete those campaigns first, or the template cannot be removed.`,
      }, { status: 409 });
    }

    const { error } = await serviceClient
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
