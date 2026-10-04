export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      phone,
      is_whatsapp,
      preferred_contact,
      industry,
      role,
      team_size,
      use_cases,
      msg_volume,
      referral_source,
    } = body;

    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { error } = await db.from("tenants").update({
      phone:             phone             || null,
      is_whatsapp:       is_whatsapp       ?? true,
      preferred_contact: preferred_contact || "whatsapp",
      industry:          industry          || null,
      role:              role              || null,
      team_size:         team_size         || null,
      use_cases:         use_cases         || [],
      msg_volume:        msg_volume        || null,
      referral_source:   referral_source   || null,
      onboarding_done:   true,
    }).eq("id", user.id);

    if (error) {
      console.error("onboarding update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("onboarding route error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
