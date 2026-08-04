export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── POST /api/team/create-account ─────────────────────────────
// Creates a Supabase auth user with email_confirm: true (bypasses
// confirmation email) for invited staff accounts. The invite token
// is validated before creating the account.
export async function POST(req: Request) {
  try {
    const { email, password, token } = await req.json();
    if (!email || !password || !token) {
      return NextResponse.json({ error: 'email, password, and token are required' }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Validate the invite token first — don't create accounts for bogus tokens
    const { data: invite, error: findErr } = await db
      .from('team_members')
      .select('id, email, status')
      .eq('invite_token', token)
      .maybeSingle();

    if (findErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
    }
    if (invite.status === 'active') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 });
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match the invited address' }, { status: 400 });
    }

    // Create user via admin API — email_confirm: true skips the confirmation email
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      // If the user already exists, that's fine — they'll sign in on the client
      if (createErr.message?.toLowerCase().includes('already registered') ||
          createErr.message?.toLowerCase().includes('already exists')) {
        return NextResponse.json({ existed: true });
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json({ userId: created.user?.id, existed: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
