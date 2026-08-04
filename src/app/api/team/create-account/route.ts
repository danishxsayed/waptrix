export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── POST /api/team/create-account ─────────────────────────────
// Creates (or fixes) a Supabase auth user for an invited staff member.
// Uses admin API so email_confirm is set to true — no confirmation
// email needed since the invite email already verified the address.
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

    // Validate the invite token
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

    // Try creating the user first
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!createErr) {
      // Fresh account created successfully
      return NextResponse.json({ userId: created.user?.id });
    }

    // User already exists — find them and confirm + update password
    const isAlreadyExists =
      createErr.message?.toLowerCase().includes('already registered') ||
      createErr.message?.toLowerCase().includes('already exists') ||
      createErr.message?.toLowerCase().includes('already been registered');

    if (!isAlreadyExists) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    // Look up the existing user by email
    const { data: listData, error: listErr } = await db.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ error: 'Failed to look up existing account' }, { status: 500 });
    }

    const existingUser = listData.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      return NextResponse.json({ error: 'Account lookup failed. Please try again.' }, { status: 500 });
    }

    // Update: confirm email + set the password they just chose
    const { error: updateErr } = await db.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      password,
    });

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ userId: existingUser.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
