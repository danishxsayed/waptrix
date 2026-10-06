export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const userId = user.id;

    // Delete all user-owned data (service key bypasses RLS)
    // Order matters: children before parents to avoid FK violations

    // 1. Campaign-related
    await db.from('message_logs').delete().eq('tenant_id', userId);
    await db.from('campaigns').delete().eq('tenant_id', userId);

    // 2. Conversations & messages
    await db.from('chat_messages').delete().eq('tenant_id', userId);
    await db.from('conversations').delete().eq('tenant_id', userId);

    // 3. Contacts & segments
    await db.from('contact_segments').delete().eq('tenant_id', userId);
    await db.from('segments').delete().eq('tenant_id', userId);
    await db.from('contacts').delete().eq('tenant_id', userId);

    // 4. Templates, automations, notifications
    await db.from('templates').delete().eq('tenant_id', userId);
    await db.from('automations').delete().eq('tenant_id', userId);
    await db.from('notifications').delete().eq('tenant_id', userId);

    // 5. Team members under this tenant
    await db.from('team_members').delete().eq('tenant_id', userId);

    // 6. WhatsApp connection
    await db.from('wa_connections').delete().eq('tenant_id', userId);

    // 7. Billing / payments
    try { await db.from('payments').delete().eq('tenant_id', userId); } catch {}

    // 8. GHL / integrations
    try { await db.from('ghl_settings').delete().eq('tenant_id', userId); } catch {}

    // 9. Tenant row
    await db.from('tenants').delete().eq('id', userId);

    // 10. Send farewell email before deleting (while email address is still valid)
    const userEmail = user.email;
    if (userEmail) {
      try {
        const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';
        await sendEmail({
          to: userEmail,
          subject: "We're going to miss you 💚",
          title: "Goodbye for now…",
          message: `Hey ${firstName},<br/><br/>
            We just wanted to say — it's been a privilege having you with us at Waptrix.
            Every campaign you launched, every conversation you had, every customer you reached —
            it all mattered, and it mattered to us too.<br/><br/>
            We know things don't always work out the way we hope, and we completely respect your decision.
            But if there's ever a day you want to give WhatsApp marketing another shot — with smarter tools,
            better support, or just fresh energy — the door is always open. Your story with Waptrix doesn't
            have to end here.<br/><br/>
            Until then, we wish you nothing but growth, great customers, and conversations that convert.
            Take care of yourself — and thank you, genuinely, for giving us a chance.<br/><br/>
            With love,<br/>
            <strong>The Waptrix Team</strong>`,
          buttonText: "Come Back Anytime →",
          buttonUrl: "https://waptrix.in/signup",
        });
      } catch (emailErr) {
        // Non-fatal — deletion proceeds even if email fails
        console.error('Farewell email failed to send:', emailErr);
      }
    }

    // 11. Sign out all sessions before deleting auth user
    await ssrClient.auth.signOut({ scope: 'global' });

    // 12. Delete auth user (must be last)
    const { error: authDeleteError } = await db.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Auth user delete error:', authDeleteError);
      return NextResponse.json({ error: 'Failed to delete auth account: ' + authDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Account delete error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
