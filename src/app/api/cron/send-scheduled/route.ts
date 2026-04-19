import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { metaApi } from '@/lib/meta';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*, templates(*), wa_connections(*)')
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No scheduled campaigns due.' });
    }

    for (const campaign of campaigns) {
      await supabase.from('campaigns').update({ status: 'SENDING' }).eq('id', campaign.id);

      const { data: contacts } = await supabase
        .from('contacts')
        .select('phone')
        .eq('tenant_id', campaign.tenant_id);

      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          try {
            await metaApi.sendTemplateMessage(
              campaign.wa_connections.access_token,
              campaign.wa_connections.phone_number_id,
              {
                to: contact.phone,
                templateName: campaign.templates.name,
                languageCode: campaign.templates.language,
                components: campaign.templates.components,
              }
            );
            
            await supabase.from('campaign_logs').insert({
              campaign_id: campaign.id,
              recipient: contact.phone,
              status: 'SENT',
            });
          } catch (sendErr: any) {
            await supabase.from('campaign_logs').insert({
              campaign_id: campaign.id,
              recipient: contact.phone,
              status: 'FAILED',
              error: sendErr.message,
            });
          }
        }
      }

      await supabase.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campaign.id);
    }

    return NextResponse.json({ message: `Processed ${campaigns.length} campaigns.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
