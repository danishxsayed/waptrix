export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await db
    .from("payments")
    .select("id, order_id, billing_cycle, amount, currency, status, cf_payment_id, paid_at, expires_at, created_at")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Assign invoice numbers (INV-0001, INV-0002...) oldest first
  const sorted = [...(data || [])].reverse();
  const withNumbers = sorted.map((p, i) => ({
    ...p,
    invoice_number: `INV-${String(i + 1).padStart(4, "0")}`,
  })).reverse();

  return NextResponse.json(withNumbers);
}
