const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Checking last 5 campaigns...");
  const { data: campaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .select('id, name, status, sent_count, total_contacts, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (campaignErr) {
    console.error("Campaign query error:", campaignErr);
    return;
  }
  
  console.log("LAST CAMPAIGNS:", JSON.stringify(campaigns, null, 2));

  for (const campaign of campaigns) {
    console.log(`\n--- Logs for campaign "${campaign.name}" (${campaign.id}) ---`);
    const { data: logs, error: logErr } = await supabase
      .from('campaign_logs')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (logErr) {
      console.error(`Error querying logs for ${campaign.id}:`, logErr);
    } else {
      console.log(`Logs count: ${logs.length}`);
      console.log("LOGS:", JSON.stringify(logs, null, 2));
    }
  }
}

run();
