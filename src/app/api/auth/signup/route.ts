export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const body = await request.json();
    const { email, password, name, company } = body;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company: company
        }
      }
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    if (authData.user) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      const { error: tenantError } = await serviceClient.from('tenants').insert({
        id: authData.user.id,
        name,
        email,
        company,
        plan: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      });

      if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 400 });

      // Send Welcome Email
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
        console.error("Failed to send welcome email:", emailErr);
        // We don't block the signup if the welcome email fails
      }
    }

    return NextResponse.json({ user: authData.user, session: authData.session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
