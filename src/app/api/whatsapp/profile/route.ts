export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const PENDING = 'pending';
const isPending = (v: string | null) => !v || v === 'pending';

async function getAuth() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = serviceClient();

    const { data: conn, error: dbError } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id, waba_id, phone_number, business_name')
      .eq('tenant_id', user.id)
      .single();

    if (dbError || !conn?.access_token) {
      console.error('wa_connections lookup failed:', dbError?.message);
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    // Resolve phone_number_id — treat 'pending' as missing
    let phoneNumberId: string | null =
      conn.phone_number_id && conn.phone_number_id !== PENDING
        ? conn.phone_number_id
        : null;

    // Self-heal: fetch phone_number_id from WABA if missing
    if (!phoneNumberId) {
      const wabaId = conn.waba_id && conn.waba_id !== PENDING ? conn.waba_id : null;
      if (wabaId) {
        try {
          const r = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${conn.access_token}`
          );
          const d = await r.json();
          const p = d?.data?.[0];
          if (p?.id) {
            phoneNumberId = p.id;
            await db.from('wa_connections').update({
              phone_number_id: p.id,
              phone_number: p.display_phone_number || conn.phone_number || '',
              business_name: p.verified_name || conn.business_name || '',
            }).eq('tenant_id', user.id);
          }
        } catch (e) {
          console.error('WABA self-heal failed:', e);
        }
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json({
        error: 'Could not resolve WhatsApp phone number. Please reconnect your account.'
      }, { status: 404 });
    }

    // Fetch WhatsApp business profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile?fields=about,description,profile_picture_url,vertical,email,websites`,
      { headers: { Authorization: `Bearer ${conn.access_token}` } }
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to fetch profile' }, { status: profileRes.status });
    }

    const profileJson = await profileRes.json();
    const data = profileJson.data?.[0] || profileJson;

    // Fetch fresh phone/business name if still empty
    let phoneName = conn.phone_number || '';
    let bizName = conn.business_name || '';
    if (!phoneName || !bizName) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${conn.access_token}`
        );
        const d = await r.json();
        phoneName = d.display_phone_number || phoneName;
        bizName = d.verified_name || bizName;
        if (phoneName || bizName) {
          await db.from('wa_connections').update({
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
      last_sync: null,
    });
  } catch (err: any) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { about, description, vertical, email, websites } = body;

    const db = serviceClient();

    const { data: conn } = await db
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

    const payload: Record<string, any> = { messaging_product: 'whatsapp' };
    if (about !== undefined) payload.about = about;
    if (description !== undefined) payload.description = description;
    if (vertical !== undefined) payload.vertical = vertical;
    if (email !== undefined) payload.email = email;
    if (websites !== undefined) payload.websites = websites;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to update profile' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
