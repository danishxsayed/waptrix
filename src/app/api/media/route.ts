export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Select metadata only — no data_url. Keeps list response tiny (<10 KB for 100 items)
    // regardless of file sizes. Thumbnails are lazy-loaded per-item via GET /api/media/[id].
    const { data, error } = await serviceClient
      .from('media')
      .select('id, name, type, size, created_at')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const VIDEO_EXTS = ["mp4","mov","webm","avi","mkv","m4v","wmv"];
    const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg","avif"];

    const normalizedData = data.map(item => {
      const mimeType: string = item.type || "";
      const ext = (item.name || "").split(".").pop()?.toLowerCase() || "";

      let category: "IMAGE" | "VIDEO" | "DOCUMENT" = "DOCUMENT";
      if (mimeType.startsWith("image/") || IMAGE_EXTS.includes(ext)) category = "IMAGE";
      else if (mimeType.startsWith("video/") || VIDEO_EXTS.includes(ext)) category = "VIDEO";

      return {
        id: item.id,
        name: item.name,
        category,
        mimeType,
        sizeBytes: item.size ?? 0,
        dataUrl: null as string | null,  // populated lazily by the client
        uploadedAt: item.created_at,
      };
    });

    return NextResponse.json(normalizedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, size, dataUrl } = body;

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await serviceClient
      .from('media')
      .insert({
        tenant_id: user.id,
        name,
        type,
        size,
        data_url: dataUrl,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
