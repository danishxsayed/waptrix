export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | 'recovery' | null;
  const next = searchParams.get('next') ?? '/connect';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  if (token_hash && type) {
    // Email verification via token hash (OTP flow)
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Successfully verified — go to next page (default: /connect)
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Verification failed
    const msg = encodeURIComponent(error.message || 'Verification failed');
    return NextResponse.redirect(`${origin}/verify-email?error=${msg}`);
  }

  if (code) {
    // PKCE flow (OAuth or magic link)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const msg = encodeURIComponent(error.message || 'Verification failed');
    return NextResponse.redirect(`${origin}/verify-email?error=${msg}`);
  }

  // No code or token — invalid callback
  return NextResponse.redirect(
    `${origin}/verify-email?error=${encodeURIComponent('Invalid verification link. Please request a new one.')}`
  );
}
