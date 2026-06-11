export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Proxies WhatsApp media files from Meta's CDN.
// Meta media URLs are temporary and require an access token — this endpoint
// fetches them server-side and streams the bytes back to the browser.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conn } = await db
      .from('wa_connections')
      .select('access_token')
      .eq('tenant_id', user.id)
      .single();

    if (!conn?.access_token) return new NextResponse('No connection', { status: 404 });

    const token = process.env.META_SYSTEM_TOKEN || conn.access_token;

    // Step 1: Get temporary media URL from Meta
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaData = await metaRes.json();

    if (!metaData.url) {
      console.error('Media URL lookup failed:', JSON.stringify(metaData).substring(0, 300));
      return new NextResponse('Media not found', { status: 404 });
    }

    // Step 2: Fetch actual bytes from Meta CDN
    const fileRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fileRes.ok) {
      return new NextResponse('Failed to fetch media', { status: fileRes.status });
    }

    const contentType = metaData.mime_type || fileRes.headers.get('content-type') || 'application/octet-stream';
    const bytes = await fileRes.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    });
  } catch (err: any) {
    console.error('Media proxy error:', err.message);
    return new NextResponse('Server error', { status: 500 });
  }
}
