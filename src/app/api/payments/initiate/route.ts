export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/plans";

const CASHFREE_ENV  = process.env.CASHFREE_ENV || "sandbox";
const CASHFREE_BASE = CASHFREE_ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

export async function POST(req: Request) {
  try {
    // ── 1. Verify auth via Bearer token ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "You must be logged in to subscribe." }, { status: 401 });
    }

    // Use anon client + user token to get authenticated user
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

    // ── 3. Check Cashfree credentials ─────────────────────────────────────────
    const appId  = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) {
      console.error("payments/initiate: Cashfree credentials missing");
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 500 }
      );
    }

    // ── 4. Fetch tenant info (name, email, phone) ─────────────────────────────
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

    // ── 5. Create Cashfree order ──────────────────────────────────────────────
    const orderId = `WPX_${planId.toUpperCase()}_${user.id.slice(0, 8)}_${Date.now()}`;

    const orderPayload = {
      order_id:       orderId,
      order_amount:   plan.amount,
      order_currency: "INR",
      order_note:     plan.description,
      customer_details: {
        customer_id:    user.id,
        customer_name:  customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?order_id={order_id}&order_status={order_status}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      },
      order_tags: {
        billing_cycle:  plan.billingCycle,
        duration_days:  String(plan.durationDays),
        customer_email: customerEmail,
        tenant_id:      user.id,
      },
    };

    console.log(`payments/initiate: creating order ${orderId} for ${customerEmail} plan=${planId} env=${CASHFREE_ENV}`);

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-version":   "2023-08-01",
        "x-client-id":     appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfRes.json();
    console.log(`payments/initiate: Cashfree response status=${cfRes.status}`, JSON.stringify(cfData).slice(0, 300));

    if (!cfRes.ok || !cfData.payment_session_id) {
      return NextResponse.json(
        { error: cfData?.message || "We couldn't create your payment session. Please try again." },
        { status: 400 }
      );
    }

    // ── 6. Pre-record order as pending ────────────────────────────────────────
    await db.from("payments").upsert({
      order_id:       orderId,
      plan_id:        "pro",
      billing_cycle:  plan.billingCycle,
      customer_email: customerEmail,
      amount:         plan.amount,
      currency:       "INR",
      status:         "pending",
      tenant_id:      user.id,
      raw:            { order_id: orderId, plan: planId },
    }, { onConflict: "order_id" });

    return NextResponse.json({
      orderId:          cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      amount:           plan.amount,
      planName:         plan.name,
    });

  } catch (err: any) {
    console.error("payments/initiate unhandled error:", err.message, err.stack);
    return NextResponse.json(
      { error: "We couldn't create your payment session. Please try again." },
      { status: 500 }
    );
  }
}
