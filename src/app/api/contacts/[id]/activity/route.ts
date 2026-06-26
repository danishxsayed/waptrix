export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Fetch Contact to verify ownership
    const { data: contact, error: contactErr } = await db
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.id)
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found or unauthorized' }, { status: 404 });
    }

    // 2. Fetch Chat Messages (find conversation first)
    let chatMessages: any[] = [];
    const { data: conversation } = await db
      .from('conversations')
      .select('id')
      .eq('tenant_id', user.id)
      .eq('contact_phone', contact.phone)
      .single();

    if (conversation) {
      const { data: messages } = await db
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      chatMessages = messages || [];
    }

    // 3. Fetch Campaign Send Logs (from message_logs)
    const { data: logs } = await db
      .from('message_logs')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('contact_id', id)
      .order('created_at', { ascending: true });

    // Fetch campaigns to map names
    const { data: campaigns } = await db
      .from('campaigns')
      .select('id, name')
      .eq('tenant_id', user.id);

    const campaignMap = new Map((campaigns || []).map(c => [c.id, c.name]));
    const mappedLogs = (logs || []).map(log => ({
      ...log,
      campaign_name: campaignMap.get(log.campaign_id) || "Bulk Broadcast"
    }));

    return NextResponse.json({
      contact,
      chatMessages,
      campaignLogs: mappedLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
