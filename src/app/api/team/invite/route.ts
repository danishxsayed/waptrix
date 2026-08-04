export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── GET /api/team/invite?token=xxx — public: return invited email for a token
// Used by the accept-invite page to pre-fill and lock the email field.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: invite, error } = await db
      .from('team_members')
      .select('email, status, role')
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
    }

    if (invite.status === 'active') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 });
    }

    return NextResponse.json({ email: invite.email, role: invite.role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
