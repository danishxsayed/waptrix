export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEffectiveTenantId } from "@/lib/tenant";

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// PATCH /api/conversations/[id] — update assigned_to / assigned_name / status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    const { id } = await params;
    const body = await req.json();

    const allowed = ["assigned_to", "assigned_name", "status", "notes"];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = serviceDb();
    const { data, error } = await db
      .from("conversations")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
