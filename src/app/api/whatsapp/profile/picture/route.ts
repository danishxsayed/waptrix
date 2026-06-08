export const dynamic = "force-dynamic";

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conn } = await serviceClient
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    const phoneNumberId = conn?.phone_number_id && conn.phone_number_id !== 'pending'
      ? conn.phone_number_id
      : null;

    if (!conn?.access_token || !phoneNumberId) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG and PNG images are supported' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    // Step 1: Upload media to Meta
    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('type', file.type);
    uploadForm.append('messaging_product', 'whatsapp');

    const uploadRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.access_token}` },
        body: uploadForm,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to upload image' }, { status: uploadRes.status });
    }

    const uploadData = await uploadRes.json();
    const mediaHandle = uploadData.h || uploadData.id;

    if (!mediaHandle) {
      return NextResponse.json({ error: 'No media handle returned from Meta' }, { status: 500 });
    }

    // Step 2: Set as profile picture using the media handle
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          profile_picture_handle: mediaHandle,
        }),
      }
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
      return NextResponse.json({ error: err.error?.message || 'Failed to set profile picture' }, { status: profileRes.status });
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
