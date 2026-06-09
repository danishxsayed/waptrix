export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token, phone_number_id')
      .eq('tenant_id', user.id)
      .single();

    const phoneNumberId = conn?.phone_number_id && conn.phone_number_id !== 'pending'
      ? conn.phone_number_id : null;

    if (!conn?.access_token || !phoneNumberId) {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG and PNG images are supported' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID!;

    // ── Step 1: Create a resumable upload session ──────────────────────────────
    // Profile pictures require the Resumable Upload API, not /{phone}/media
    const sessionRes = await fetch(
      `https://graph.facebook.com/v19.0/${appId}/uploads` +
      `?file_length=${file.size}` +
      `&file_type=${encodeURIComponent(file.type)}` +
      `&access_token=${conn.access_token}`,
      { method: 'POST' }
    );

    if (!sessionRes.ok) {
      const err = await sessionRes.json();
      console.error('Upload session error:', JSON.stringify(err));
      return NextResponse.json({ error: err.error?.message || 'Failed to create upload session' }, { status: sessionRes.status });
    }

    const { id: uploadSessionId } = await sessionRes.json();
    console.log('Upload session:', uploadSessionId);

    // ── Step 2: Upload file bytes to the session ───────────────────────────────
    const fileBytes = await file.arrayBuffer();

    const uploadRes = await fetch(
      `https://graph.facebook.com/v19.0/${uploadSessionId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${conn.access_token}`,
          'file_offset': '0',
          'Content-Type': file.type,
        },
        body: fileBytes,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      console.error('File upload error:', JSON.stringify(err));
      return NextResponse.json({ error: err.error?.message || 'Failed to upload file' }, { status: uploadRes.status });
    }

    const uploadData = await uploadRes.json();
    console.log('Upload result:', JSON.stringify(uploadData));

    // Response contains { h: "<handle>" }
    const handle = uploadData.h;
    if (!handle) {
      return NextResponse.json({ error: 'No upload handle returned from Meta' }, { status: 500 });
    }

    // ── Step 3: Set as WhatsApp Business profile picture ──────────────────────
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
          profile_picture_handle: handle,
        }),
      }
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
      console.error('Set profile picture error:', JSON.stringify(err));
      return NextResponse.json({ error: err.error?.message || 'Failed to set profile picture' }, { status: profileRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Profile picture error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
