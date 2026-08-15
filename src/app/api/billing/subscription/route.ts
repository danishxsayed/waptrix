export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssr.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = serviceDb();

  // Get tenant plan info
  const { data: tenant } = await db
    .from("tenants")
    .select("plan, plan_expires_at, trial_ends_at")
    .eq("id", user.id)
    .single();

  // Get latest paid payment for this tenant
  const { data: lastPayment } = await db
    .from("payments")
    .select("order_id, billing_cycle, amount, currency, paid_at, expires_at, status, cf_payment_id")
    .eq("tenant_id", user.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const planExpiresAt = tenant?.plan_expires_at ? new Date(tenant.plan_expires_at) : null;
  const trialEndsAt   = tenant?.trial_ends_at   ? new Date(tenant.trial_ends_at)   : null;

  let status = "inactive";
  if (tenant?.plan === "pro" && planExpiresAt && planExpiresAt > now)       status = "active";
  else if (tenant?.plan === "trial" && trialEndsAt && trialEndsAt > now)    status = "trial";
  else if (tenant?.plan === "pro" && planExpiresAt && planExpiresAt <= now) status = "expired";

  return NextResponse.json({
    plan:            tenant?.plan || "trial",
    status,
    billing_cycle:   lastPayment?.billing_cycle || null,
    amount:          lastPayment?.amount || null,
    currency:        lastPayment?.currency || "INR",
    started_at:      lastPayment?.paid_at || null,
    expires_at:      tenant?.plan_expires_at || null,
    trial_ends_at:   tenant?.trial_ends_at || null,
    last_order_id:   lastPayment?.order_id || null,
    last_payment_id: lastPayment?.cf_payment_id || null,
  });
}

// POST /api/billing/subscription — cancel subscription
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();
  if (action !== "cancel") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const db = serviceDb();
  const { error } = await db
    .from("tenants")
    .update({ plan: "trial", plan_expires_at: null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
