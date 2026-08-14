export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/plans";

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

const CASHFREE_ENV  = process.env.CASHFREE_ENV || "sandbox";
const CASHFREE_BASE = CASHFREE_ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

export async function POST(req: Request) {
  try {
    // ── 1. Authenticate user ──────────────────────────────────────────────────
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be logged in to start a subscription." }, { status: 401 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    // ── 3. Fetch tenant info (name, phone) ────────────────────────────────────
    const db = serviceDb();
    const { data: tenant } = await db
      .from("tenants")
      .select("name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const customerEmail = tenant?.email || user.email || "";
    const customerName  = tenant?.name  || user.user_metadata?.full_name || "Customer";
    const customerPhone = (tenant?.phone || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";

    // ── 4. Create Cashfree order ──────────────────────────────────────────────
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

    const appId  = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secret) {
      console.error("Cashfree credentials missing from environment");
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 500 }
      );
    }

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-version":   "2023-08-01",
        "x-client-id":     appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error("Cashfree order creation failed:", JSON.stringify(cfData));
      return NextResponse.json(
        { error: cfData?.message || "We couldn't create your payment session. Please try again." },
        { status: 400 }
      );
    }

    // ── 5. Pre-record order as pending in payments table ──────────────────────
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
    console.error("payments/initiate error:", err.message, err.stack);
    return NextResponse.json(
      { error: "We couldn't create your payment session. Please try again." },
      { status: 500 }
    );
  }
}
