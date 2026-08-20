export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

/**
 * POST /api/conversations/ensure
 * Finds or creates an empty conversation for a given phone number.
 * Does NOT send any message — just ensures the conversation record exists.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);

    const { phone, name } = await req.json();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Normalize phone — strip spaces, ensure leading +
    const normalized = phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim()}`;

    // Try to find existing conversation
    const { data: existing } = await db
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_phone', normalized)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }

    // Create new empty conversation
    const contactName = name?.trim() || normalized;
    const { data: created, error } = await db
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        contact_phone: normalized,
        contact_name: contactName,
        last_message: '',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        status: 'open',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ conversation: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
