export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/plans";

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function razorpayAuth() {
  return "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
}

export async function POST(req: Request) {
  try {
    // ── 1. Verify auth via Bearer token ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "You must be logged in to subscribe." }, { status: 401 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      console.error("payments/initiate: auth error", userError?.message);
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    // ── 3. Check Razorpay credentials ─────────────────────────────────────────
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("payments/initiate: Razorpay credentials missing");
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 500 }
      );
    }

    // ── 4. Fetch tenant info ──────────────────────────────────────────────────
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const { data: tenant } = await db
      .from("tenants")
      .select("name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const customerEmail = tenant?.email || user.email || "";
    const customerName  = tenant?.name  || user.user_metadata?.full_name || "Customer";
    const rawPhone      = tenant?.phone || "";
    const customerPhone = rawPhone.replace(/\D/g, "").slice(-10) || "9999999999";

    if (!customerEmail) {
      return NextResponse.json({ error: "Account email not found. Please contact support." }, { status: 400 });
    }

    // ── 5. Create Razorpay order ──────────────────────────────────────────────
    const receipt = `WPX_${planId.toUpperCase()}_${user.id.slice(0, 8)}_${Date.now()}`;

    const orderPayload = {
      amount:   plan.amount * 100, // paise
      currency: "INR",
      receipt,
      notes: {
        billing_cycle:  plan.billingCycle,
        duration_days:  String(plan.durationDays),
        customer_email: customerEmail,
        tenant_id:      user.id,
        plan_name:      plan.name,
      },
    };

    console.log(`payments/initiate: creating Razorpay order ${receipt} for ${customerEmail} plan=${planId}`);

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": razorpayAuth(),
      },
      body:   JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(8000),
    });

    const rzpData = await rzpRes.json();
    console.log(`payments/initiate: Razorpay response status=${rzpRes.status}`, JSON.stringify(rzpData).slice(0, 300));

    if (!rzpRes.ok || !rzpData.id) {
      return NextResponse.json(
        { error: rzpData?.error?.description || "We couldn't create your payment session. Please try again." },
        { status: 400 }
      );
    }

    // ── 6. Pre-record order as pending ────────────────────────────────────────
    await db.from("payments").upsert({
      order_id:       receipt,
      plan_id:        "pro",
      billing_cycle:  plan.billingCycle,
      customer_email: customerEmail,
      amount:         plan.amount,
      currency:       "INR",
      status:         "pending",
      tenant_id:      user.id,
      raw:            { receipt, razorpay_order_id: rzpData.id, plan: planId },
    }, { onConflict: "order_id" }).catch((e: any) => console.error("pending upsert failed:", e));

    return NextResponse.json({
      razorpayOrderId: rzpData.id,
      amountPaise:     rzpData.amount,
      amount:          plan.amount,
      planName:        plan.name,
      prefill: {
        name:    customerName,
        email:   customerEmail,
        contact: customerPhone,
      },
    });

  } catch (err: any) {
    console.error("payments/initiate unhandled error:", err.message, err.stack);
    return NextResponse.json(
      { error: "We couldn't create your payment session. Please try again." },
      { status: 500 }
    );
  }
}
