export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

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
          // 3. Fetch contacts in segment
          let contactsQuery = serviceClient
            .from('contacts')
            .select('phone')
            .eq('tenant_id', user.id);

          if (segment_id) {
            contactsQuery = contactsQuery.eq('segment_id', segment_id);
          }

          const { data: contacts } = await contactsQuery;

          if (contacts && contacts.length > 0) {
            // Update status to 'sending'
            await serviceClient.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id);

            let sentCount = 0;
            let failedCount = 0;

            for (const contact of contacts) {
              try {
                await metaApi.sendTemplateMessage(
                  waConnection.access_token,
                  waConnection.phone_number_id,
                  {
                    to: contact.phone,
                    templateName: template.name,
                    languageCode: template.language,
                    components: template.components || [],
                  }
                );
                
                await serviceClient.from('campaign_logs').insert({
                  campaign_id: campaign.id,
                  recipient: contact.phone,
                  status: 'SENT',
                });
                sentCount++;
              } catch (sendErr: any) {
                console.error(`Immediate send failed for ${contact.phone}:`, sendErr.message);
                await serviceClient.from('campaign_logs').insert({
                  campaign_id: campaign.id,
                  recipient: contact.phone,
                  status: 'FAILED',
                  error: sendErr.message || String(sendErr),
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
