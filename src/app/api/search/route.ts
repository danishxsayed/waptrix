export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEffectiveTenantId } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const tenantId = await getEffectiveTenantId(db, user.id);
    const like = `%${q}%`;

    // Run all searches in parallel
    const [contactsRes, campaignsRes, templatesRes, convsRes] = await Promise.all([
      db.from("contacts")
        .select("id, name, phone, email")
        .eq("tenant_id", tenantId)
        .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .limit(5),

      db.from("campaigns")
        .select("id, name, status, created_at")
        .eq("tenant_id", tenantId)
        .ilike("name", like)
        .limit(4),

      db.from("templates")
        .select("id, name, category, meta_status")
        .eq("tenant_id", tenantId)
        .ilike("name", like)
        .limit(4),

      db.from("conversations")
        .select("id, contact_name, contact_phone, last_message")
        .eq("tenant_id", tenantId)
        .or(`contact_name.ilike.${like},contact_phone.ilike.${like}`)
        .limit(4),
    ]);

    const results: any[] = [];

    for (const c of contactsRes.data || []) {
      results.push({
        type: "contact",
        id:   c.id,
        title: c.name || c.phone,
        sub:  c.phone,
        href: `/contacts?highlight=${c.id}`,
      });
    }

    for (const c of campaignsRes.data || []) {
      results.push({
        type:  "campaign",
        id:    c.id,
        title: c.name,
        sub:   c.status,
        href:  `/campaigns/${c.id}`,
      });
    }

    for (const t of templatesRes.data || []) {
      results.push({
        type:  "template",
        id:    t.id,
        title: t.name,
        sub:   `${t.category} · ${t.meta_status}`,
        href:  `/templates`,
      });
    }

    for (const conv of convsRes.data || []) {
      results.push({
        type:  "conversation",
        id:    conv.id,
        title: conv.contact_name || conv.contact_phone,
        sub:   conv.last_message?.slice(0, 60) || conv.contact_phone,
        href:  `/inbox?conversation=${conv.id}`,
      });
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
