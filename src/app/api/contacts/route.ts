export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

async function getAuthUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const db = serviceDb();

    const { data, error } = await db
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const body = await request.json();
    const { name, phone, email, custom1, custom2, custom3, opted_in, segment_id } = body;

    const db = serviceDb();

    // Normalize phone
    const rawDigits = (phone || '').replace(/\D/g, '');
    const phoneWithPlus = rawDigits ? `+${rawDigits}` : '';
    const phoneWithoutPlus = rawDigits;

    // Duplicate check
    if (rawDigits) {
      let existing: { id: string; phone: string } | null = null;
      const { data: e1 } = await db.from('contacts').select('id, phone').eq('tenant_id', tenantId).eq('phone', phoneWithPlus).maybeSingle();
      if (e1) { existing = e1; }
      else {
        const { data: e2 } = await db.from('contacts').select('id, phone').eq('tenant_id', tenantId).eq('phone', phoneWithoutPlus).maybeSingle();
        if (e2) existing = e2;
      }
      if (existing) {
        return NextResponse.json(
          { error: 'A contact with this phone number already exists.', existing_id: existing.id },
          { status: 409 }
        );
      }
    }

    const { data, error } = await db
      .from('contacts')
      .insert({
        tenant_id: tenantId,
        segment_id: segment_id || null,
        name: name || '',
        phone: phone || '',
        email: email || null,
        custom1: custom1 || null,
        custom2: custom2 || null,
        custom3: custom3 || null,
        opted_in: opted_in !== undefined ? opted_in : null
      })
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) {
      return NextResponse.json({ error: 'Contact ID or IDs required' }, { status: 400 });
    }

    const db = serviceDb();
    let query = db.from('contacts').delete().eq('tenant_id', tenantId);

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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { ids, segment_id, opted_in } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs list required' }, { status: 400 });
    }

    const db = serviceDb();

    const updatePayload: any = {};
    if (segment_id !== undefined) updatePayload.segment_id = segment_id;
    if (opted_in !== undefined) {
      updatePayload.opted_in = opted_in;
      updatePayload.opted_out_at = opted_in === false ? new Date().toISOString() : null;
    }

    const { error } = await db
      .from('contacts')
      .update(updatePayload)
      .in('id', ids)
      .eq('tenant_id', tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      const keys = await redis.keys(`contacts:${tenantId}:*`);
      if (keys.length > 0) await redis.del(...keys);
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const body = await request.json();
    const db = serviceDb();

    // Global tag operation
    const { tagAction, oldTag, newTag } = body;
    if (tagAction && oldTag) {
      const { data: contacts, error: fetchErr } = await db
        .from('contacts')
        .select('id, custom2')
        .eq('tenant_id', tenantId)
        .ilike('custom2', `%${oldTag}%`);

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

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
            const { error: updateErr } = await db
              .from('contacts')
              .update({ custom2: newCustom2 })
              .eq('id', contact.id)
              .eq('tenant_id', tenantId);
            if (!updateErr) updatedCount++;
          }
        });
        await Promise.all(updatePromises);
      }
      return NextResponse.json({ success: true, updatedCount });
    }

    // Single contact update
    const { id, name, phone, email, custom1, custom2, custom3, opted_in, segment_id } = body;
    if (!id) return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });

    const { data, error } = await db
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
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
