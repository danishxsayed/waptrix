export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'


import { NextResponse } from 'next/server';

export async function GET() {
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

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('contacts')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { name, phone, email, custom1, custom2, custom3, opted_in, segment_id } = body;

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('contacts')
      .upsert({
        tenant_id: user.id,
        segment_id: segment_id || null,
        name: name || '',
        phone: phone || '',
        email: email || null,
        custom1: custom1 || null,
        custom2: custom2 || null,
        custom3: custom3 || null,
        opted_in: opted_in !== undefined ? opted_in : true
      }, { onConflict: 'tenant_id,phone' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) {
      return NextResponse.json({ error: 'Contact ID or IDs required' }, { status: 400 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    let query = serviceClient.from('contacts').delete().eq('tenant_id', user.id);

    if (id) {
      query = query.eq('id', id);
    } else if (idsParam) {
      const ids = idsParam.split(',').map(x => x.trim()).filter(Boolean);
      query = query.in('id', ids);
    }

    const { error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    const { ids, segment_id, opted_in } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs list required' }, { status: 400 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const updatePayload: any = {};
    if (segment_id !== undefined) updatePayload.segment_id = segment_id;
    if (opted_in !== undefined) updatePayload.opted_in = opted_in;

    const { error } = await serviceClient
      .from('contacts')
      .update(updatePayload)
      .in('id', ids)
      .eq('tenant_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json();
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Check if it's a global tag operation
    const { tagAction, oldTag, newTag } = body;
    if (tagAction && oldTag) {
      const { data: contacts, error: fetchErr } = await serviceClient
        .from('contacts')
        .select('id, custom2')
        .eq('tenant_id', user.id)
        .ilike('custom2', `%${oldTag}%`);

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }

      let updatedCount = 0;
      if (contacts && contacts.length > 0) {
        const updatePromises = contacts.map(async (contact) => {
          const rawTags = contact.custom2 || "";
          const tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean);
          
          const index = tags.findIndex((t: string) => t.toLowerCase() === oldTag.toLowerCase());
          if (index !== -1) {
            if (tagAction === 'rename' && newTag) {
              tags[index] = newTag.trim();
            } else if (tagAction === 'delete') {
              tags.splice(index, 1);
            } else {
              return;
            }
            
            const newCustom2 = tags.length > 0 ? tags.join(', ') : null;
            
            const { error: updateErr } = await serviceClient
              .from('contacts')
              .update({ custom2: newCustom2 })
              .eq('id', contact.id)
              .eq('tenant_id', user.id);

            if (!updateErr) updatedCount++;
          }
        });
        await Promise.all(updatePromises);
      }

      return NextResponse.json({ success: true, updatedCount });
    }

    // Otherwise, single contact update
    const { id, name, phone, email, custom1, custom2, custom3, opted_in, segment_id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('contacts')
      .update({
        segment_id: segment_id || null,
        name: name || '',
        phone: phone || '',
        email: email || null,
        custom1: custom1 || null,
        custom2: custom2 || null,
        custom3: custom3 || null,
        opted_in: opted_in !== undefined ? opted_in : true
      })
      .eq('id', id)
      .eq('tenant_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

