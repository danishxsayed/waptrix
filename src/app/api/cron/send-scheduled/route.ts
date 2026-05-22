import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: campaigns, error } = await serviceClient
      .from('campaigns')
      .select('*, templates(*)')
      .in('status', ['SCHEDULED', 'queued', 'scheduled'])
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No scheduled campaigns due.' });
    }

    for (const campaign of campaigns) {
      // Transition to 'sending' status
      await serviceClient.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id);

      // Fetch active wa_connection for this tenant
      const { data: waConnection, error: connError } = await serviceClient
        .from('wa_connections')
        .select('*')
        .eq('tenant_id', campaign.tenant_id)
        .single();

      if (connError || !waConnection) {
        console.error(`No WhatsApp connection found for tenant ${campaign.tenant_id}`);
        await serviceClient
          .from('campaigns')
          .update({ status: 'failed', failed_count: 1 })
          .eq('id', campaign.id);
        continue;
      }

      // Fetch contacts for the specific campaign segment
      let contactsQuery = serviceClient
        .from('contacts')
        .select('id, phone')
        .eq('tenant_id', campaign.tenant_id);

      if (campaign.segment_id) {
        contactsQuery = contactsQuery.eq('segment_id', campaign.segment_id);
      }

      const { data: contacts } = await contactsQuery;

      if (contacts && contacts.length > 0) {
        let sentCount = 0;
        let failedCount = 0;
        for (const contact of contacts) {
          try {
            const response = await metaApi.sendTemplateMessage(
              waConnection.access_token,
              waConnection.phone_number_id,
              {
                to: contact.phone,
                templateName: campaign.templates.name,
                languageCode: campaign.templates.language,
                components: campaign.templates.components || [],
              }
            );
            
            const metaMsgId = response?.messages?.[0]?.id || null;

            await serviceClient.from('message_logs').insert({
              campaign_id: campaign.id,
              tenant_id: campaign.tenant_id,
              contact_id: contact.id,
              phone: contact.phone,
              status: 'sent',
              meta_msg_id: metaMsgId,
              sent_at: new Date().toISOString()
            });
            sentCount++;
          } catch (sendErr: any) {
            const errorMsg = sendErr.response?.data?.error?.message || sendErr.message || String(sendErr);
            console.error(`Failed to send message to ${contact.phone}:`, errorMsg);
            
            await serviceClient.from('message_logs').insert({
              campaign_id: campaign.id,
              tenant_id: campaign.tenant_id,
              contact_id: contact.id,
              phone: contact.phone,
              status: 'failed',
              error: errorMsg,
            });
            failedCount++;
          }
        }

        // Transition to 'sent' status and update counts
        await serviceClient
          .from('campaigns')
          .update({ 
            status: 'sent',
            sent_count: sentCount,
            failed_count: failedCount,
            total_contacts: contacts.length,
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);
      } else {
        // No contacts found, mark as sent/completed with 0
        await serviceClient
          .from('campaigns')
          .update({ 
            status: 'sent',
            total_contacts: 0,
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);
      }
    }

    return NextResponse.json({ message: `Processed ${campaigns.length} campaigns.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
