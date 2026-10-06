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

  // Collect cookies Supabase wants to set so we can apply them to the redirect response
  const pendingCookies: { name: string; value: string; options?: any }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          // Store them so we can apply to the redirect response later
          pendingCookies.push(...cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Helper: create a redirect and apply all pending session cookies to it
  function redirectWithCookies(url: string) {
    const response = NextResponse.redirect(url);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options ?? {});
    });
    return response;
  }

  // ── Token hash flow (email OTP / magic link) ─────────────────────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Check onboarding status so returning users go to dashboard
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { createClient: svc } = await import('@supabase/supabase-js');
          const serviceClient = svc(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
          );
          const { data: tenant } = await serviceClient
            .from('tenants')
            .select('onboarding_done')
            .eq('id', user.id)
            .maybeSingle();
          const dest = tenant?.onboarding_done ? '/dashboard' : '/onboarding';
          return redirectWithCookies(`${origin}${dest}`);
        }
      } catch {
        // fallback to next param
      }
      return redirectWithCookies(`${origin}${next}`);
    }
    const msg = encodeURIComponent(error.message || 'Verification failed');
    return redirectWithCookies(`${origin}/verify-email?error=${msg}`);
  }

  // ── PKCE code flow (OAuth or email confirmation) ──────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { createClient: svc } = await import('@supabase/supabase-js');
          const serviceClient = svc(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
          );

          const hasEmailIdentity = user.identities?.some(
            (identity: any) => identity.provider === 'email'
          );
          const isEmailOnlyUser = hasEmailIdentity &&
            (user.identities?.length ?? 0) === 1;

          // Email/password user confirming their email
          if (isEmailOnlyUser) {
            const { data: tenant } = await serviceClient
              .from('tenants')
              .select('onboarding_done')
              .eq('id', user.id)
              .maybeSingle();
            const dest = tenant?.onboarding_done ? '/dashboard' : '/onboarding';
            return redirectWithCookies(`${origin}${dest}`);
          }

          // OAuth user who also has an email/password account → block
          if (hasEmailIdentity && (user.identities?.length ?? 0) > 1) {
            return redirectWithCookies(
              `${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`
            );
          }

          // Pure OAuth (Google etc.) — provision tenant if new user
          const { data: existingTenant } = await serviceClient
            .from('tenants')
            .select('id, onboarding_done')
            .eq('id', user.id)
            .maybeSingle();

          if (!existingTenant) {
            const userEmail = user.email ?? '';
            if (userEmail) {
              const { data: emailTenant } = await serviceClient
                .from('tenants')
                .select('id')
                .eq('email', userEmail)
                .maybeSingle();
              if (emailTenant) {
                return redirectWithCookies(
                  `${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`
                );
              }
            }

            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] || 'User';
            const email = user.email ?? '';
            const company = user.user_metadata?.company || '';
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);

            await serviceClient.from('tenants').insert({
              id: user.id, name, email, company,
              plan: 'trial', trial_ends_at: trialEndsAt.toISOString(),
            });

            try {
              const { sendEmail } = await import('@/lib/email/resend');
              await sendEmail({
                to: email,
                subject: "Welcome to Waptrix!",
                title: "Setup Successful!",
                message: `Hi ${name}, welcome to Waptrix! 🎉 Your 7-day free trial has started.`,
                buttonText: "Go to Dashboard",
                buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/connect`,
              });
            } catch (e) {
              console.error("Welcome email failed:", e);
            }

            return redirectWithCookies(`${origin}/onboarding`);
          }

          // Returning OAuth user
          const dest = existingTenant.onboarding_done ? '/dashboard' : '/onboarding';
          return redirectWithCookies(`${origin}${dest}`);
        }
      } catch (err) {
        console.error("Callback provisioning error:", err);
      }
      return redirectWithCookies(`${origin}${next}`);
    }

    const errMsg = error.message || '';
    const isEmailConflict =
      errMsg.toLowerCase().includes('already registered') ||
      errMsg.toLowerCase().includes('already exists') ||
      errMsg.toLowerCase().includes('email already') ||
      errMsg.toLowerCase().includes('user already');
    if (isEmailConflict) {
      return redirectWithCookies(
        `${origin}/login?message=${encodeURIComponent('This email is already registered. Please log in with your email and password.')}`
      );
    }
    return redirectWithCookies(`${origin}/verify-email?error=${encodeURIComponent(errMsg || 'Verification failed')}`);
  }

  // No code or token — invalid callback
  return redirectWithCookies(
    `${origin}/verify-email?error=${encodeURIComponent('Invalid verification link. Please request a new one.')}`
  );
}
