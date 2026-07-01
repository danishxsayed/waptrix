export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Returns a signed upload URL so the client can PUT the file directly to
// Supabase Storage — file binary never passes through Vercel, bypassing the 4.5MB limit.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType } = await request.json();
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 });

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const safeName = (fileName as string).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { data, error } = await serviceClient.storage
      .from('template-media')
      .createSignedUploadUrl(path);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = serviceClient.storage
      .from('template-media')
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
