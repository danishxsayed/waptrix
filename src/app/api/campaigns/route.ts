export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

// Normalize phone to digits-only without leading + so lookups match regardless of format
function normalizePhone(phone: string): string {
  return phone.replace(/^\+/, '');
}

// Build Meta runtime components for template message sends.
// variable_mapping: { "1": "name", "2": "phone", ... }
// contact: { name, phone, email, custom1, custom2, custom3 }
function buildRuntimeComponents(
  templateBody: string,
  variableMapping: Record<string, string>,
  contact: Record<string, any>
): any[] {
  const varMatches = templateBody.match(/\{\{(\d+)\}\}/g) || [];
  if (varMatches.length === 0) return [];

  const parameters = varMatches.map((v) => {
    const num = v.replace('{{', '').replace('}}', '');
    const fieldName = variableMapping[num] || '';
    const value = contact[fieldName] || fieldName || `{{${num}}}`;
    return { type: 'text', text: String(value) };
  });

  return [{ type: 'body', parameters }];
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await ssrClient.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await serviceClient
      .from('campaigns')
      .select('*, template:templates(*), segment:segments(*)')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getUser() {
  const cookieStore = await cookies()
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await ssrClient.auth.getUser()
  return user
}

export async function POST(req: Request) {
  try {
    console.log('Campaign POST started')
    
    const user = await getUser()
    console.log('User:', user?.id)
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any = {}
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    
    console.log('Body received:', JSON.stringify(body))
    
    // Support both camelCase and snake_case for maximum compatibility
    const name = body.name
    const templateId = body.templateId || body.template_id
    const segmentId = body.segmentId || body.segment_id
    
    if (!name) return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    if (!templateId) return NextResponse.json({ error: 'Template is required' }, { status: 400 })
    if (!segmentId) return NextResponse.json({ error: 'Segment/audience is required' }, { status: 400 })

    // rest of the existing code continues...
    const { 
      variable_mapping, 
      send_now, 
      scheduled_at, 
      status 
    } = body;

    const template_id = templateId;
    const segment_id = segmentId;

    // Handle immediate launches: auto-set to 'queued' with current time
    const finalStatus = send_now || !scheduled_at ? 'queued' : (status || 'queued');
    const finalScheduledAt = send_now || !scheduled_at ? new Date().toISOString() : scheduled_at;

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: campaign, error } = await serviceClient
      .from('campaigns')
      .insert({
        tenant_id: user.id,
        name,
        template_id,
        segment_id,
        variable_mapping: variable_mapping || {},
        scheduled_at: finalScheduledAt,
        status: finalStatus,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If campaign is immediate ('queued'), execute sending logic inline!
    if (finalStatus === 'queued') {
      try {
        console.log(`Executing immediate campaign send for ID: ${campaign.id}`);
        
        // 1. Fetch template details
        const { data: template } = await serviceClient
          .from('templates')
          .select('*')
          .eq('id', template_id)
          .single();

        // 2. Fetch active wa_connection
        const { data: waConnection } = await serviceClient
          .from('wa_connections')
          .select('*')
          .eq('tenant_id', user.id)
          .single();

        if (template && waConnection) {
          // 3. Fetch contacts in segment (include all fields for variable substitution)
          let contactsQuery = serviceClient
            .from('contacts')
            .select('id, phone, name, email, custom1, custom2, custom3')
            .eq('tenant_id', user.id);

          if (segment_id) {
            contactsQuery = contactsQuery.eq('segment_id', segment_id);
          }

          const { data: contacts } = await contactsQuery;

          if (contacts && contacts.length > 0) {
            // Update status to 'sending'
            await serviceClient.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id);

            // META_SYSTEM_TOKEN has send permissions granted via Embedded Signup.
            // Falls back to tenant's own token if system token not configured.
            const sendToken = process.env.META_SYSTEM_TOKEN || waConnection.access_token;

            let sentCount = 0;
            let failedCount = 0;

            for (const contact of contacts) {
              try {
                // Build runtime components from variable_mapping + contact data
                const runtimeComponents = buildRuntimeComponents(
                  template.body || '',
                  variable_mapping || {},
                  contact
                );

                // Normalize: Meta stores/sends without leading +
                const normalizedPhone = normalizePhone(contact.phone);

                const response = await metaApi.sendTemplateMessage(
                  sendToken,
                  waConnection.phone_number_id,
                  {
                    to: normalizedPhone,
                    templateName: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    languageCode: template.language,
                    components: runtimeComponents,
                  }
                );

                const metaMsgId = response?.messages?.[0]?.id || null;
                const now = new Date().toISOString();
                const messageContent = `[Template: ${template.name}]`;

                // ── Sync to inbox ─────────────────────────────────────
                // Search both formats to avoid duplicate conversations
                const { data: existingConv } = await serviceClient
                  .from('conversations')
                  .select('id, unread_count')
                  .eq('tenant_id', user.id)
                  .or(`contact_phone.eq.${normalizedPhone},contact_phone.eq.+${normalizedPhone}`)
                  .single();

                let conversationId: string;
                if (existingConv) {
                  conversationId = existingConv.id;
                  await serviceClient.from('conversations').update({
                    contact_name: contact.name || normalizedPhone,
                    last_message: messageContent,
                    last_message_at: now,
                  }).eq('id', conversationId);
                } else {
                  const { data: newConv } = await serviceClient
                    .from('conversations')
                    .insert({
                      tenant_id: user.id,
                      contact_phone: normalizedPhone, // store without + to match Meta webhook format
                      contact_name: contact.name || normalizedPhone,
                      last_message: messageContent,
                      last_message_at: now,
                      unread_count: 0,
                      status: 'open',
                    })
                    .select('id')
                    .single();
                  conversationId = newConv!.id;
                }

                // Insert outbound chat message so the thread is visible
                await serviceClient.from('chat_messages').insert({
                  tenant_id: user.id,
                  conversation_id: conversationId,
                  direction: 'outbound',
                  meta_message_id: metaMsgId,
                  type: 'template',
                  content: messageContent,
                  status: 'sent',
                  created_at: now,
                });
                // ─────────────────────────────────────────────────────

                await serviceClient.from('message_logs').insert({
                  campaign_id: campaign.id,
                  tenant_id: user.id,
                  contact_id: contact.id,
                  phone: contact.phone,
                  status: 'sent',
                  meta_msg_id: metaMsgId,
                  sent_at: now,
                });
                sentCount++;
              } catch (sendErr: any) {
                const errorMsg = sendErr.response?.data?.error?.message || sendErr.message || String(sendErr);
                console.error(`Immediate send failed for ${contact.phone}:`, errorMsg);
                
                await serviceClient.from('message_logs').insert({
                  campaign_id: campaign.id,
                  tenant_id: user.id,
                  contact_id: contact.id,
                  phone: contact.phone,
                  status: 'failed',
                  error: errorMsg,
                });
                failedCount++;
              }
            }

            // Update status and final counts
            const { data: updatedCampaign } = await serviceClient
              .from('campaigns')
              .update({
                status: 'sent',
                sent_count: sentCount,
                failed_count: failedCount,
                total_contacts: contacts.length,
                completed_at: new Date().toISOString()
              })
              .eq('id', campaign.id)
              .select()
              .single();
            
            return NextResponse.json(updatedCampaign || campaign);
          } else {
            // No contacts, set completed with 0 total contacts
            const { data: updatedCampaign } = await serviceClient
              .from('campaigns')
              .update({
                status: 'sent',
                total_contacts: 0,
                completed_at: new Date().toISOString()
              })
              .eq('id', campaign.id)
              .select()
              .single();
            return NextResponse.json(updatedCampaign || campaign);
          }
        } else {
          // Missing template or connection
          console.error("Missing template or WhatsApp connection for immediate launch");
          await serviceClient
            .from('campaigns')
            .update({ status: 'failed', failed_count: 1 })
            .eq('id', campaign.id);
        }
      } catch (sendErr: any) {
        console.error("Immediate campaign send crashed:", sendErr.message);
        await serviceClient
          .from('campaigns')
          .update({ status: 'failed', failed_count: 1 })
          .eq('id', campaign.id);
      }
    }

    return NextResponse.json(campaign);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
