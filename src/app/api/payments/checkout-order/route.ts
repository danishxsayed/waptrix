export const dynamic = "force-dynamic";

// Cookie-based (with Bearer token fallback) Razorpay order creation used by
// the /checkout page.  We try the Bearer token first (same pattern as
// /api/payments/initiate) because it has no SSR dependencies.  If the
// browser client hasn't synced the session to localStorage yet, we fall back
// to cookie-based auth via @supabase/ssr.

import { NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function razorpayAuth() {
  return "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
}

export async function POST(req: Request) {
  try {
    // ── 1. Auth: Bearer first, cookies fallback ───────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    let userId    = "";
    let userEmail = "";
    let userMeta: Record<string, any> = {};

    if (token) {
      // Try Bearer token (fastest path — no SSR cookie dependency)
      const anon = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (!error && user) {
        userId    = user.id;
        userEmail = user.email ?? "";
        userMeta  = user.user_metadata ?? {};
      }
    }

    if (!userId) {
      // Fallback: read session from HTTP cookies
      try {
        const supabase = await createCookieClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          userId    = user.id;
          userEmail = user.email ?? "";
          userMeta  = user.user_metadata ?? {};
        }
      } catch (cookieErr: any) {
        console.error("checkout-order: cookie-client error", cookieErr?.message);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated. Please log in." }, { status: 401 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    // ── 3. Check Razorpay credentials ─────────────────────────────────────────
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("checkout-order: Razorpay credentials missing");
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 500 }
      );
    }

    // ── 4. Fetch tenant info ──────────────────────────────────────────────────
    const db = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const { data: tenant } = await db
      .from("tenants")
      .select("name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    const customerEmail = tenant?.email || userEmail || "";
    const customerName  = tenant?.name  || userMeta?.full_name || "Customer";
    const rawPhone      = tenant?.phone || "";
    const customerPhone = rawPhone.replace(/\D/g, "").slice(-10) || "9999999999";

    if (!customerEmail) {
      return NextResponse.json({ error: "Account email not found." }, { status: 400 });
    }

    // ── 5. Create Razorpay order ──────────────────────────────────────────────
    const receipt = `WPX_${planId.toUpperCase()}_${userId.slice(0, 8)}_${Date.now()}`;

    const orderPayload = {
      amount:   plan.amount * 100,
      currency: "INR",
      receipt,
      notes: {
        billing_cycle:  plan.billingCycle,
        duration_days:  String(plan.durationDays),
        customer_email: customerEmail,
        tenant_id:      userId,
        plan_name:      plan.name,
      },
    };

    console.log(`checkout-order: creating order ${receipt} for ${customerEmail} plan=${planId}`);

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": razorpayAuth(),
      },
      body:   JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(10000),
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || !rzpData.id) {
      console.error("checkout-order: Razorpay error", JSON.stringify(rzpData));
      return NextResponse.json(
        { error: rzpData?.error?.description || "Failed to create payment order. Please try again." },
        { status: 400 }
      );
    }

    // ── 6. Pre-record order as pending ────────────────────────────────────────
    try {
      await db.from("payments").upsert({
        order_id:       receipt,
        plan_id:        "pro",
        billing_cycle:  plan.billingCycle,
        customer_email: customerEmail,
        amount:         plan.amount,
        currency:       "INR",
        status:         "pending",
        tenant_id:      userId,
        raw:            { receipt, razorpay_order_id: rzpData.id, plan: planId },
      }, { onConflict: "order_id" });
    } catch (upsertErr: any) {
      // Non-fatal — payment can proceed even if pre-recording fails
      console.error("checkout-order: pending upsert failed:", upsertErr?.message);
    }

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
    console.error("checkout-order unhandled error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Could not create payment session. Please try again." },
      { status: 500 }
    );
  }
}
