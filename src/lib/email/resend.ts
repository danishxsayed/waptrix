import { getEmailTemplate } from "./template";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Waptrix <no-reply@waptrix.in>";

interface SendEmailParams {
  to: string;
  subject: string;
  title: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
}

export async function sendEmail({ to, subject, title, message, buttonText, buttonUrl }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not defined in environment variables.");
    return { error: "Email configuration missing" };
  }

  const html = getEmailTemplate(title, message, buttonText, buttonUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.message || "Failed to send email" };
    }

    return { data };
  } catch (error) {
    console.error("Resend delivery error:", error);
    return { error: "Internal email delivery error" };
  }
}
