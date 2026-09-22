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
      // After a successful OAuth exchange, provision tenant record if this is
      // a first-time Google (or other OAuth) signup.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { createClient: createServiceClient } = await import('@supabase/supabase-js');
          const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
          );

          // Check if a tenant record already exists for this user
          const { data: existingTenant } = await serviceClient
            .from('tenants')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (!existingTenant) {
            // First-time OAuth signup — create tenant record
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User';
            const email = user.email ?? '';
            const company = user.user_metadata?.company || '';

            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);

            await serviceClient.from('tenants').insert({
              id: user.id,
              name,
              email,
              company,
              plan: 'trial',
              trial_ends_at: trialEndsAt.toISOString(),
            });

            // Send welcome email
            try {
              const { sendEmail } = await import('@/lib/email/resend');
              await sendEmail({
                to: email,
                subject: "Welcome to Waptrix!",
                title: "Setup Successful!",
                message: `Hi ${name}, welcome to Waptrix! 🎉 Your 7-day free trial has started. You have full access to all Pro features — bulk campaigns, automation, analytics, and more. No credit card needed during the trial.\n\nStart by connecting your WhatsApp Business account in the dashboard. Your trial ends on ${trialEndsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                buttonText: "Go to Dashboard",
                buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/connect`
              });
            } catch (emailErr) {
              console.error("Failed to send welcome email (OAuth):", emailErr);
              // Don't block the login if the email fails
            }

            // New signup — send to /connect to set up WhatsApp
            return NextResponse.redirect(`${origin}/connect`);
          } else {
            // Returning user — send to dashboard
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        }
      } catch (provisionErr) {
        console.error("Failed to provision tenant on OAuth signup:", provisionErr);
        // Don't block the login if provisioning fails
      }

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
