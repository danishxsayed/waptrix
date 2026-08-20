export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEffectiveTenantId } from '@/lib/tenant';

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
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  );
  const { data: { user } } = await ssrClient.auth.getUser();
  return user;
}

// ── GET /api/team — list all members for this owner ──────────
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only owners (not staff members) can manage the team
    const tenantId = await getEffectiveTenantId(user.id);
    // Staff members can't manage team — only the actual owner can
    if (tenantId !== user.id) {
      return NextResponse.json({ error: 'Only the account owner can manage team members' }, { status: 403 });
    }

    const db = serviceDb();
    const { data, error } = await db
      .from('team_members')
      .select('id, member_user_id, email, role, status, invited_at, accepted_at')
      .eq('owner_tenant_id', user.id)
      .order('invited_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/team — invite a new team member ─────────────────
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = await getEffectiveTenantId(user.id);
    if (tenantId !== user.id) {
      return NextResponse.json({ error: 'Only the account owner can invite team members' }, { status: 403 });
    }

    const { email, role = 'agent' } = await req.json();
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
    if (!['admin', 'agent'].includes(role)) {
      return NextResponse.json({ error: 'role must be admin or agent' }, { status: 400 });
    }

    // Can't invite yourself
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    const db = serviceDb();

    // Upsert — re-invite if pending, error if already active
    const { data: existing } = await db
      .from('team_members')
      .select('id, status')
      .eq('owner_tenant_id', user.id)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'This person is already a team member' }, { status: 409 });
    }

    let memberId: string;
    let inviteToken: string;

    if (existing?.status === 'pending') {
      // Re-send invite — generate a fresh token
      const freshToken = crypto.randomUUID();
      await db.from('team_members')
        .update({ invite_token: freshToken, role, invited_at: new Date().toISOString() })
        .eq('id', existing.id);
      memberId = existing.id;
      inviteToken = freshToken;
    } else {
      // New invite
      inviteToken = crypto.randomUUID();
      const { data: created, error: insertErr } = await db
        .from('team_members')
        .insert({
          owner_tenant_id: user.id,
          email: email.toLowerCase(),
          role,
          invite_token: inviteToken,
        })
        .select('id')
        .single();

      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
      memberId = created.id;
    }

    // Send invite email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.waptrix.in';
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    // Get owner's business name for the email
    const { data: ownerProfile } = await db.auth.admin.getUserById(user.id);
    const ownerName = ownerProfile?.user?.user_metadata?.name || ownerProfile?.user?.email || 'Your team';

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Waptrix <no-reply@waptrix.in>',
          to: email,
          subject: `You've been invited to join ${ownerName} on Waptrix`,
          html: getInviteEmail({ inviteUrl, ownerName, role, appUrl }),
        }),
      });
    }

    return NextResponse.json({ id: memberId, email, role, status: 'pending', inviteUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Email template ───────────────────────────────────────────
function getInviteEmail(params: {
  inviteUrl: string;
  ownerName: string;
  role: string;
  appUrl: string;
}) {
  const { inviteUrl, ownerName, role } = params;
  const roleLabel = role === 'admin' ? 'Admin' : 'Agent';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#080A0F;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080A0F;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0E1117;border:1px solid #273042;border-radius:24px;overflow:hidden;">
        <tr>
          <td style="padding:36px 40px 28px;background:linear-gradient(135deg,#0E1117 0%,#161B26 100%);text-align:center;border-bottom:1px solid #1E293B;">
            <div style="display:inline-flex;align-items:center;gap:12px;justify-content:center;">
              <div style="background:#10B981;color:#080A0F;padding:10px 16px;border-radius:12px;font-weight:900;font-size:20px;box-shadow:0 0 20px rgba(16,185,129,0.35);">W</div>
              <span style="color:#10B981;font-size:22px;font-weight:800;">Waptrix</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;">
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:16px;padding:24px;text-align:center;">
              <div style="font-size:40px;margin-bottom:10px;">🤝</div>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#E2E8F0;">You're invited!</h1>
              <p style="margin:0;font-size:15px;color:#8896AB;line-height:1.65;">
                <strong style="color:#E2E8F0;">${ownerName}</strong> has invited you to join their WhatsApp marketing team on Waptrix as <strong style="color:#10B981;">${roleLabel}</strong>.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="background:#161B26;border:1px solid #273042;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#8896AB;text-transform:uppercase;letter-spacing:1px;">As a ${roleLabel}, you can:</p>
              ${role === 'admin'
                ? `<p style="margin:4px 0;font-size:13px;color:#CBD5E1;">✅ Manage contacts, templates &amp; campaigns</p>
                   <p style="margin:4px 0;font-size:13px;color:#CBD5E1;">✅ Reply to conversations in the shared inbox</p>
                   <p style="margin:4px 0;font-size:13px;color:#CBD5E1;">✅ View analytics and reports</p>`
                : `<p style="margin:4px 0;font-size:13px;color:#CBD5E1;">✅ Reply to conversations in the shared inbox</p>
                   <p style="margin:4px 0;font-size:13px;color:#CBD5E1;">✅ View contacts and templates</p>`
              }
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:center;">
            <a href="${inviteUrl}" style="display:inline-block;background:#10B981;color:#080A0F;padding:14px 36px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 0 20px rgba(16,185,129,0.25);">
              Accept Invitation &rarr;
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#4A5568;">Or copy this link: <span style="color:#8896AB;">${inviteUrl}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="height:1px;background:#1E293B;margin-bottom:24px;"></div>
            <p style="margin:0;font-size:12px;color:#4A5568;text-align:center;">
              This invite link expires after it's used or when a new invite is sent.<br/>
              &copy; 2026 Waptrix &mdash; WhatsApp Marketing Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
