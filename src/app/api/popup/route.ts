export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint — no auth required (marketing site reads this)
export async function GET() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await db
      .from("popup_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) {
      // No config yet — return safe default (disabled)
      return NextResponse.json({ enabled: false, image_url: null, link_url: "/pricing" });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ enabled: false, image_url: null, link_url: "/pricing" });
  }
}
