export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// POST /api/flows/send
// Body: { flow_id, flow_name, phone, header_text?, body_text?, cta_text?, screen_id? }
// Sends a WhatsApp Flow message to a single phone number.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    flow_id,
    flow_name,
    phone,
    header_text = 'Please fill out the form',
    body_text = 'Tap the button below to open the form.',
    cta_text = 'Open Form',
    screen_id,        // optional: first screen ID override
  } = body;

  if (!flow_id || !phone) {
    return NextResponse.json({ error: 'flow_id and phone are required' }, { status: 400 });
  }

  // Get WA connection
  const { data: conn } = await db
    .from('wa_connections')
    .select('phone_number_id, access_token')
    .eq('tenant_id', user.id)
    .single();

  if (!conn?.phone_number_id || !conn?.access_token) {
    return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
  }

  const token = process.env.META_SYSTEM_TOKEN || conn.access_token;
  const flowToken = randomUUID(); // unique per send — used to match response

  const actionPayload: Record<string, any> = {
    flow_message_version: '3',
    flow_token: flowToken,
    flow_id,
    flow_cta: cta_text,
    flow_action: 'navigate',
  };
  if (screen_id) {
    actionPayload.flow_action_payload = { screen: screen_id };
  }

  const messagePayload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: header_text },
      body: { text: body_text },
      action: {
        name: 'flow',
        parameters: actionPayload,
      },
    },
  };

  const sendRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    }
  );

  const sendData = await sendRes.json();
  if (!sendRes.ok) {
    return NextResponse.json(
      { error: sendData?.error?.message || 'Failed to send flow' },
      { status: 502 }
    );
  }

  // Look up contact_id for this phone (best effort)
  const normalizedPhone = phone.replace(/^\+/, '');
  const { data: contact } = await db
    .from('contacts')
    .select('id')
    .eq('tenant_id', user.id)
    .or(`phone.eq.${phone},phone.eq.+${normalizedPhone},phone.eq.${normalizedPhone}`)
    .maybeSingle();

  // Store a pending flow_response row so we can track it later
  await db.from('flow_responses').insert({
    tenant_id: user.id,
    flow_id,
    flow_name: flow_name || null,
    flow_token: flowToken,
    contact_phone: phone,
    contact_id: contact?.id || null,
    response_data: { status: 'sent' },
  });

  return NextResponse.json({ success: true, flow_token: flowToken });
}
