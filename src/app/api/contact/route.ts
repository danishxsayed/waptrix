export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const INQUIRY_EMAIL  = "mddanishsayed786@gmail.com";
const FROM_EMAIL     = "Waptrix <no-reply@waptrix.in>";

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");
      return NextResponse.json({ error: "Email not configured." }, { status: 500 });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111B21">
        <div style="background:#25D366;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;color:#ffffff;font-size:20px">📩 New Contact Form Inquiry</h2>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">via waptrix.in/contact</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #E9EDEF;border-top:none;border-radius:0 0 12px 12px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:12px;color:#667781;font-weight:bold;text-transform:uppercase;width:100px">Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:14px;color:#111B21;font-weight:600">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:12px;color:#667781;font-weight:bold;text-transform:uppercase">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:14px;color:#111B21;font-weight:600">
                <a href="mailto:${email}" style="color:#25D366;text-decoration:none">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:12px;color:#667781;font-weight:bold;text-transform:uppercase">Phone</td>
              <td style="padding:10px 0;border-bottom:1px solid #E9EDEF;font-size:14px;color:#111B21;font-weight:600">${phone || "—"}</td>
            </tr>
            <tr>
              <td style="padding:14px 0 0;font-size:12px;color:#667781;font-weight:bold;text-transform:uppercase;vertical-align:top">Message</td>
              <td style="padding:14px 0 0;font-size:14px;color:#111B21;line-height:1.6;white-space:pre-wrap">${message}</td>
            </tr>
          </table>

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E9EDEF">
            <a href="mailto:${email}?subject=Re: Your Waptrix inquiry"
              style="display:inline-block;background:#25D366;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:100px;text-decoration:none">
              Reply to ${name}
            </a>
          </div>
        </div>
        <p style="text-align:center;font-size:11px;color:#667781;margin-top:16px">Waptrix · waptrix.in</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   INQUIRY_EMAIL,
        reply_to: email,
        subject: `New inquiry from ${name} — Waptrix`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return NextResponse.json({ error: "Failed to send. Try emailing us directly." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Contact form error:", err.message);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
