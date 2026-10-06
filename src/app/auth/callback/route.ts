export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const code        = searchParams.get('code');
  const token_hash  = searchParams.get('token_hash');
  const type        = searchParams.get('type') as 'email' | 'recovery' | null;
  const next        = searchParams.get('next') ?? '/onboarding';

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options?: any }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Returns an HTML page that sets cookies AND does a JS redirect.
  // Using 200 + JS instead of 302 ensures Set-Cookie headers are
  // processed by the browser before navigation, so the next page
  // receives the session cookies.
  function htmlRedirect(url: string) {
    const safeUrl = url.replace(/'/g, "\\'");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body><script>window.location.replace('${safeUrl}');</script></body></html>`;
    const response = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options ?? {});
    });
    return response;
  }

  // ── Token hash flow (email OTP) ──────────────────────────────────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { createClient: svc } = await import('@supabase/supabase-js');
          const db = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
          const { data: tenant } = await db.from('tenants').select('onboarding_done').eq('id', user.id).maybeSingle();
          return htmlRedirect(`${origin}${tenant?.onboarding_done ? '/dashboard' : '/onboarding'}`);
        }
      } catch { /* fall through */ }
      return htmlRedirect(`${origin}${next}`);
    }
    return htmlRedirect(`${origin}/verify-email?error=${encodeURIComponent(error.message || 'Verification failed')}`);
  }

  // ── PKCE code flow (OAuth or email confirmation) ─────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { createClient: svc } = await import('@supabase/supabase-js');
          const db = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

          const hasEmailIdentity  = user.identities?.some((i: any) => i.provider === 'email');
          const isEmailOnlyUser   = hasEmailIdentity && (user.identities?.length ?? 0) === 1;

          // Email/password user verifying their email
          if (isEmailOnlyUser) {
            const { data: tenant } = await db.from('tenants').select('onboarding_done').eq('id', user.id).maybeSingle();
            return htmlRedirect(`${origin}${tenant?.onboarding_done ? '/dashboard' : '/onboarding'}`);
          }

          // OAuth user who already has email/password → block
          if (hasEmailIdentity && (user.identities?.length ?? 0) > 1) {
            return htmlRedirect(`${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`);
          }

          // New OAuth (Google) user — provision tenant
          const { data: existingTenant } = await db.from('tenants').select('id, onboarding_done').eq('id', user.id).maybeSingle();

          if (!existingTenant) {
            const userEmail = user.email ?? '';
            if (userEmail) {
              const { data: emailTenant } = await db.from('tenants').select('id').eq('email', userEmail).maybeSingle();
              if (emailTenant) {
                return htmlRedirect(`${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`);
              }
            }
            const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);
            await db.from('tenants').insert({ id: user.id, name, email: user.email ?? '', company: user.user_metadata?.company || '', plan: 'trial', trial_ends_at: trialEndsAt.toISOString() });
            try {
              const { sendEmail } = await import('@/lib/email/resend');
              await sendEmail({ to: user.email ?? '', subject: "Welcome to Waptrix!", title: "Setup Successful!", message: `Hi ${name}, welcome to Waptrix! Your 7-day free trial has started.`, buttonText: "Go to Dashboard", buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/connect` });
            } catch (e) { console.error("Welcome email failed:", e); }
            return htmlRedirect(`${origin}/onboarding`);
          }

          return htmlRedirect(`${origin}${existingTenant.onboarding_done ? '/dashboard' : '/onboarding'}`);
        }
      } catch (e) { console.error("Callback error:", e); }
      return htmlRedirect(`${origin}${next}`);
    }

    const errMsg = error.message || '';
    if (['already registered','already exists','email already','user already'].some(s => errMsg.toLowerCase().includes(s))) {
      return htmlRedirect(`${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`);
    }
    return htmlRedirect(`${origin}/verify-email?error=${encodeURIComponent(errMsg || 'Verification failed')}`);
  }

  return htmlRedirect(`${origin}/verify-email?error=${encodeURIComponent('Invalid verification link. Please request a new one.')}`);
}
