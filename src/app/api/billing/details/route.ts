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
  const { data, error } = await db
    .from("tenants")
    .select("name, email, phone, billing_info")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bi = data.billing_info || {};
  return NextResponse.json({
    billing_name:    bi.billing_name    || data.name    || "",
    billing_email:   bi.billing_email   || data.email   || "",
    billing_phone:   bi.billing_phone   || data.phone   || "",
    billing_address: bi.billing_address || "",
    billing_city:    bi.billing_city    || "",
    billing_state:   bi.billing_state   || "",
    billing_pincode: bi.billing_pincode || "",
    billing_gst:     bi.billing_gst     || "",
  });
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = serviceDb();

  const { error } = await db
    .from("tenants")
    .update({ billing_info: body })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
