export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ── POST /api/team/accept — link a signed-up user to the team ─
// Called from /accept-invite page after the user logs in / signs up.
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

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Find the pending invite
    const { data: invite, error: findErr } = await db
      .from('team_members')
      .select('id, email, owner_tenant_id, status')
      .eq('invite_token', token)
      .maybeSingle();

    if (findErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
    }

    if (invite.status === 'active') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 });
    }

    // Optional: verify the signed-up email matches the invited email
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: `Please sign in with ${invite.email} — that's the email address that was invited.`,
      }, { status: 400 });
    }

    // Accept invite: link member_user_id
    const { error: updateErr } = await db
      .from('team_members')
      .update({
        member_user_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
        invite_token: null,  // consume the token
      })
      .eq('id', invite.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true, tenantId: invite.owner_tenant_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
