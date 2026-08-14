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

function verifySignature(body: string, signature: string, timestamp: string): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}${body}`)
    .digest("base64");
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

// ─── Helper: resolve tenant from email or tenant_id tag ──────────────────────
async function resolveTenant(db: ReturnType<typeof serviceDb>, tags: Record<string, string>, customerEmail: string) {
  // Prefer tenant_id from order tags (set by /api/payments/initiate)
  if (tags.tenant_id) {
    const { data } = await db.from("tenants").select("id, name, email").eq("id", tags.tenant_id).maybeSingle();
    if (data) return data;
  }
  // Fallback to email lookup
  if (customerEmail) {
    const { data } = await db.from("tenants").select("id, name, email").eq("email", customerEmail).maybeSingle();
    if (data) return data;
  }
  return null;
}

// ─── Idempotency: check if we've already processed this event ─────────────────
async function alreadyProcessed(db: ReturnType<typeof serviceDb>, orderId: string, status: string) {
  const { data } = await db.from("payments").select("status").eq("order_id", orderId).maybeSingle();
  return data?.status === status;
}

export async function POST(req: Request) {
  try {
    const rawBody   = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    // Verify signature in production
    if (process.env.CASHFREE_ENV === "production") {
      if (!verifySignature(rawBody, signature, timestamp)) {
        console.error("Cashfree webhook: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event      = JSON.parse(rawBody);
    const { type, data } = event;
    console.log(`Cashfree webhook: ${type}`, JSON.stringify(data).slice(0, 300));

    const db = serviceDb();

    // ── PAYMENT SUCCESS ───────────────────────────────────────────────────────
    if (type === "PAYMENT_SUCCESS_WEBHOOK" || type === "ORDER_PAID") {
      const { order, payment } = data;
      const tags          = order?.order_tags || {};
      const billingCycle  = tags.billing_cycle || "monthly";
      const durationDays  = parseInt(tags.duration_days || "31", 10);
      const customerEmail = order?.customer_details?.customer_email || tags.customer_email || "";
      const orderId       = order?.order_id || payment?.order_id;

      // Idempotency guard
      if (await alreadyProcessed(db, orderId, "paid")) {
        console.log(`Webhook: order ${orderId} already processed as paid — skipping`);
        return NextResponse.json({ received: true });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const tenant = await resolveTenant(db, tags, customerEmail);

      // Upsert payment record
      await db.from("payments").upsert({
        order_id:       orderId,
        plan_id:        "pro",
        billing_cycle:  billingCycle,
        customer_email: customerEmail,
        amount:         payment?.payment_amount,
        currency:       payment?.payment_currency || "INR",
        status:         "paid",
        cf_payment_id:  payment?.cf_payment_id,
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
          // Clear trial fields once paid
          trial_ends_at: null,
        }).eq("id", tenant.id);
      }

      // Send payment success email
      const recipientEmail = tenant?.email || customerEmail;
      if (recipientEmail) {
        const label       = BILLING_LABELS[billingCycle] || billingCycle;
        const amountLabel = PLAN_AMOUNTS[billingCycle]   || `₹${payment?.payment_amount}`;
        const expiryStr   = expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        await sendEmail({
          to:         recipientEmail,
          subject:    "🎉 Payment Successful — Your Waptrix Pro Subscription Is Active",
          title:      "Payment Successful — You're on Waptrix Pro!",
          message:    `Hi ${tenant?.name || "there"},\n\nYour payment of ${amountLabel} for the Waptrix Pro (${label}) plan was successful.\n\nYour subscription is now active and expires on ${expiryStr}.\n\nPayment ID: ${payment?.cf_payment_id || orderId}\n\nYou now have full access to bulk campaigns, smart inbox, automation, analytics, and more.`,
          buttonText: "Go to Dashboard",
          buttonUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }).catch((e) => console.error("Failed to send payment success email:", e));
      }
    }

    // ── PAYMENT FAILED ────────────────────────────────────────────────────────
    else if (type === "PAYMENT_FAILED_WEBHOOK") {
      const { order, payment } = data;
      const tags          = order?.order_tags || {};
      const customerEmail = order?.customer_details?.customer_email || tags.customer_email || "";
      const orderId       = order?.order_id || payment?.order_id;

      // Update payment status to failed
      await db.from("payments").upsert({
        order_id:       orderId,
        plan_id:        "pro",
        billing_cycle:  tags.billing_cycle || "monthly",
        customer_email: customerEmail,
        amount:         payment?.payment_amount,
        currency:       "INR",
        status:         "failed",
        tenant_id:      tags.tenant_id || null,
        raw:            event,
      }, { onConflict: "order_id" });

      // Send payment failure email
      if (customerEmail) {
        await sendEmail({
          to:         customerEmail,
          subject:    "Payment Failed — Waptrix Pro",
          title:      "We couldn't process your payment",
          message:    `Hi there,\n\nUnfortunately your payment for Waptrix Pro was not successful.\n\nReason: ${payment?.payment_message || "Payment was declined"}\n\nPlease try again — your selected plan and account are saved. If you continue to face issues, contact our support team.`,
          buttonText: "Try Again",
          buttonUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        }).catch((e) => console.error("Failed to send payment failed email:", e));
      }
    }

    // ── PAYMENT PENDING ───────────────────────────────────────────────────────
    else if (type === "PAYMENT_PENDING_WEBHOOK") {
      const { order, payment } = data;
      const tags          = order?.order_tags || {};
      const orderId       = order?.order_id || payment?.order_id;
      const customerEmail = order?.customer_details?.customer_email || tags.customer_email || "";

      await db.from("payments").upsert({
        order_id:       orderId,
        plan_id:        "pro",
        billing_cycle:  tags.billing_cycle || "monthly",
        customer_email: customerEmail,
        amount:         payment?.payment_amount,
        currency:       "INR",
        status:         "pending",
        tenant_id:      tags.tenant_id || null,
        raw:            event,
      }, { onConflict: "order_id" });

      if (customerEmail) {
        await sendEmail({
          to:         customerEmail,
          subject:    "Payment Pending — Waptrix Pro",
          title:      "Your payment is being processed",
          message:    `Hi there,\n\nYour payment for Waptrix Pro is currently pending verification. This usually resolves within a few minutes.\n\nWe'll activate your subscription automatically once the payment is confirmed and send you a confirmation email.\n\nIf you don't hear from us within 24 hours, please contact support.`,
          buttonText: "Contact Support",
          buttonUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
        }).catch((e) => console.error("Failed to send payment pending email:", e));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Cashfree webhook error:", err.message, err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
