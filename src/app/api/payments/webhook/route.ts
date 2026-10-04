export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";
import crypto from "crypto";
import { sendEmail } from "@/lib/email/resend";

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Razorpay signs the raw body with HMAC-SHA256 (hex) using the webhook secret
function verifyRazorpaySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if not configured
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

const BILLING_LABELS: Record<string, string> = {
  monthly:   "Monthly",
  quarterly: "Quarterly (3 months)",
  yearly:    "Yearly",
};

const PLAN_AMOUNTS: Record<string, string> = {
  monthly:   "₹1,999",
  quarterly: "₹4,999",
  yearly:    "₹17,999",
};

// ─── Resolve tenant from notes ────────────────────────────────────────────────
async function resolveTenant(
  db: ReturnType<typeof serviceDb>,
  notes: Record<string, string>,
  customerEmail: string
) {
  if (notes.tenant_id) {
    const { data } = await db.from("tenants").select("id, name, email").eq("id", notes.tenant_id).maybeSingle();
    if (data) return data;
  }
  if (customerEmail) {
    const { data } = await db.from("tenants").select("id, name, email").eq("email", customerEmail).maybeSingle();
    if (data) return data;
  }
  return null;
}

// ─── Idempotency check ────────────────────────────────────────────────────────
async function alreadyProcessed(db: ReturnType<typeof serviceDb>, orderId: string, status: string) {
  const { data } = await db.from("payments").select("status").eq("order_id", orderId).maybeSingle();
  return data?.status === status;
}

export async function POST(req: Request) {
  try {
    const rawBody   = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Verify signature in production
    if (process.env.NODE_ENV === "production" && signature) {
      if (!verifyRazorpaySignature(rawBody, signature)) {
        console.warn("Razorpay webhook: signature mismatch — rejecting");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event    = JSON.parse(rawBody);
    const { event: eventType, payload } = event;
    console.log(`Razorpay webhook: ${eventType}`, JSON.stringify(payload).slice(0, 300));

    const db = serviceDb();

    // ── PAYMENT CAPTURED (success) ────────────────────────────────────────────
    if (eventType === "payment.captured" || eventType === "payment.authorized") {
      const payment = payload?.payment?.entity || {};
      const order   = payload?.order?.entity   || {};
      const notes   = payment.notes || order.notes || {};

      const billingCycle  = notes.billing_cycle  || "monthly";
      const durationDays  = parseInt(notes.duration_days || "31", 10);
      const customerEmail = notes.customer_email || payment.email || "";
      // Use our receipt as the stable order_id key (matches what we stored in payments table)
      const orderId       = order.receipt || payment.order_id;
      const razorpayPayId = payment.id;

      // Idempotency guard
      if (await alreadyProcessed(db, orderId, "paid")) {
        console.log(`Webhook: order ${orderId} already processed as paid — skipping`);
        return NextResponse.json({ received: true });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const tenant = await resolveTenant(db, notes, customerEmail);

      // Upsert payment record
      await db.from("payments").upsert({
        order_id:       orderId,
        plan_id:        "pro",
        billing_cycle:  billingCycle,
        customer_email: customerEmail,
        amount:         Math.round((payment.amount || 0) / 100), // paise → INR
        currency:       payment.currency || "INR",
        status:         "paid",
        cf_payment_id:  razorpayPayId, // reusing column to store Razorpay payment ID
        paid_at:        new Date().toISOString(),
        expires_at:     expiresAt.toISOString(),
        tenant_id:      tenant?.id || null,
        raw:            event,
      }, { onConflict: "order_id" });

      // Activate / renew tenant plan
      if (tenant?.id) {
        await db.from("tenants").update({
          plan:            "pro",
          plan_expires_at: expiresAt.toISOString(),
          trial_ends_at:   null,
        }).eq("id", tenant.id);
      }

      // Send success email
      const recipientEmail = tenant?.email || customerEmail;
      if (recipientEmail) {
        const label       = BILLING_LABELS[billingCycle] || billingCycle;
        const amountLabel = PLAN_AMOUNTS[billingCycle]   || `₹${Math.round((payment.amount || 0) / 100)}`;
        const expiryStr   = expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        await sendEmail({
          to:         recipientEmail,
          subject:    "🎉 Payment Successful — Your Waptrix Pro Subscription Is Active",
          title:      "Payment Successful — You're on Waptrix Pro!",
          message:    `Hi ${tenant?.name || "there"},\n\nYour payment of ${amountLabel} for the Waptrix Pro (${label}) plan was successful.\n\nYour subscription is now active and expires on ${expiryStr}.\n\nPayment ID: ${razorpayPayId || orderId}\n\nYou now have full access to bulk campaigns, smart inbox, automation, analytics, and more.`,
          buttonText: "Go to Dashboard",
          buttonUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }).catch((e) => console.error("Failed to send payment success email:", e));
      }
    }

    // ── PAYMENT FAILED ────────────────────────────────────────────────────────
    else if (eventType === "payment.failed") {
      const payment = payload?.payment?.entity || {};
      const order   = payload?.order?.entity   || {};
      const notes   = payment.notes || order.notes || {};

      const customerEmail = notes.customer_email || payment.email || "";
      const orderId       = order.receipt || payment.order_id;

      await db.from("payments").upsert({
        order_id:       orderId,
        plan_id:        "pro",
        billing_cycle:  notes.billing_cycle || "monthly",
        customer_email: customerEmail,
        amount:         Math.round((payment.amount || 0) / 100),
        currency:       "INR",
        status:         "failed",
        tenant_id:      notes.tenant_id || null,
        raw:            event,
      }, { onConflict: "order_id" });

      if (customerEmail) {
        await sendEmail({
          to:         customerEmail,
          subject:    "Payment Failed — Waptrix Pro",
          title:      "We couldn't process your payment",
          message:    `Hi there,\n\nUnfortunately your payment for Waptrix Pro was not successful.\n\nReason: ${payment.error_description || payment.error_reason || "Payment was declined"}\n\nPlease try again — your selected plan and account are saved. If you continue to face issues, contact our support team.`,
          buttonText: "Try Again",
          buttonUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        }).catch((e) => console.error("Failed to send payment failed email:", e));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Razorpay webhook error:", err.message, err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
