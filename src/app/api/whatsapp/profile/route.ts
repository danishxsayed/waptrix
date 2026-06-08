export const dynamic = "force-dynamic";

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

const PENDING = 'pending';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = getServiceClient();

    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, phone_number_id, waba_id, phone_number, business_name, updated_at')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    let phoneNumberId: string | null =
      conn.phone_number_id && conn.phone_number_id !== PENDING
        ? conn.phone_number_id
        : null;

    // Self-heal: if phone_number_id is missing or 'pending', fetch from WABA
    if (!phoneNumberId) {
      const wabaId = conn.waba_id && conn.waba_id !== PENDING ? conn.waba_id : null;
      if (wabaId) {
        try {
          const wabaRes = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${conn.access_token}`
          );
          const wabaData = await wabaRes.json();
          const firstPhone = wabaData?.data?.[0];
          if (firstPhone?.id) {
            phoneNumberId = firstPhone.id;
            await serviceClient.from('wa_connections').update({
              phone_number_id: firstPhone.id,
              phone_number: firstPhone.display_phone_number || conn.phone_number || '',
              business_name: firstPhone.verified_name || conn.business_name || '',
            }).eq('tenant_id', user.id);
          }
        } catch (e) {
          console.error('WABA phone lookup failed:', e);
        }
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json({
        error: 'Could not resolve phone number ID. Please reconnect your WhatsApp account.'
      }, { status: 404 });
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile?fields=about,description,profile_picture_url,vertical,email,websites`,
      { headers: { Authorization: `Bearer ${conn.access_token}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to fetch profile' }, { status: res.status });
    }

    const profile = await res.json();
    const data = profile.data?.[0] || profile;

    // Fetch fresh phone/business name if still empty
    let phoneName = conn.phone_number || '';
    let bizName = conn.business_name || '';
    if (!phoneName || !bizName) {
      try {
        const pRes = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${conn.access_token}`
        );
        const pData = await pRes.json();
        phoneName = pData.display_phone_number || phoneName;
        bizName = pData.verified_name || bizName;
        if (phoneName || bizName) {
          await serviceClient.from('wa_connections').update({
            phone_number: phoneName,
            business_name: bizName,
          }).eq('tenant_id', user.id);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      about: data.about || '',
      description: data.description || '',
      profile_picture_url: data.profile_picture_url || null,
      vertical: data.vertical || '',
      email: data.email || '',
      websites: data.websites || [],
      phone_number: phoneName,
      business_name: bizName,
      last_sync: conn.updated_at,
    });
  } catch (err: any) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { about, description, vertical, email, websites } = body;

    const serviceClient = getServiceClient();

    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    const phoneNumberId = conn?.phone_number_id && conn.phone_number_id !== PENDING
      ? conn.phone_number_id
      : null;

    if (!conn?.access_token || !phoneNumberId) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = { messaging_product: 'whatsapp' };
    if (about !== undefined) updatePayload.about = about;
    if (description !== undefined) updatePayload.description = description;
    if (vertical !== undefined) updatePayload.vertical = vertical;
    if (email !== undefined) updatePayload.email = email;
    if (websites !== undefined) updatePayload.websites = websites;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to update profile' }, { status: res.status });
    }

    await serviceClient
      .from('wa_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('tenant_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
