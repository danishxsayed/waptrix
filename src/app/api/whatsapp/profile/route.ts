export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, phone_number_id, waba_id, phone_number, business_name, updated_at')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    let phoneNumberId = conn.phone_number_id;

    // Self-heal: if phone_number_id is missing, fetch it from the WABA
    if (!phoneNumberId && conn.waba_id) {
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/v19.0/${conn.waba_id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${conn.access_token}`
        );
        const wabaData = await wabaRes.json();
        const firstPhone = wabaData?.data?.[0];
        if (firstPhone?.id) {
          phoneNumberId = firstPhone.id;
          // Persist so we don't need to do this again
          await serviceClient.from('wa_connections').update({
            phone_number_id: firstPhone.id,
            phone_number: firstPhone.display_phone_number || conn.phone_number,
            business_name: firstPhone.verified_name || conn.business_name,
          }).eq('tenant_id', user.id);
        }
      } catch (_) {}
    }

    if (!phoneNumberId) {
      return NextResponse.json({ error: 'No WhatsApp connection found. Please reconnect.' }, { status: 404 });
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

    return NextResponse.json({
      about: data.about || '',
      description: data.description || '',
      profile_picture_url: data.profile_picture_url || null,
      vertical: data.vertical || '',
      email: data.email || '',
      websites: data.websites || [],
      phone_number: conn.phone_number,
      business_name: conn.business_name,
      last_sync: conn.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { about, description, vertical, email, websites } = body;

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token || !conn?.phone_number_id) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};
    if (about !== undefined) updatePayload.about = about;
    if (description !== undefined) updatePayload.description = description;
    if (vertical !== undefined) updatePayload.vertical = vertical;
    if (email !== undefined) updatePayload.email = email;
    if (websites !== undefined) updatePayload.websites = websites;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${conn.phone_number_id}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...updatePayload }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to update profile' }, { status: res.status });
    }

    // Update last sync timestamp
    await serviceClient
      .from('wa_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('tenant_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
