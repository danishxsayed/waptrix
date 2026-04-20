import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email/resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const supabase = createServiceClient();

    // Generate a password reset link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      }
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    if (linkData.properties?.action_link) {
      // Send the beautiful email template
      const { error: emailError } = await sendEmail({
        to: email,
        subject: "Reset your Waptrix password",
        title: "Password Recovery",
        message: "We received a request to reset your Waptrix password. Click the button below to choose a new one. This link will expire shortly.",
        buttonText: "Reset Password",
        buttonUrl: linkData.properties.action_link
      });

      if (emailError) {
        return NextResponse.json({ error: "Failed to send recovery email. Please try again later." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
