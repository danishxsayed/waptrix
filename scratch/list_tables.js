const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Listing database tables...");
  const { data, error } = await supabase.rpc('get_tables_info');
  if (error) {
    console.log("RPC get_tables_info failed, trying raw SQL query via pg_catalog...");
    // Since we don't have direct SQL client, let's query a known table or check via a common query if we can
    const { data: tables, error: sqlError } = await supabase.from('campaigns').select('id').limit(1);
    if (sqlError) console.error("Error querying campaigns:", sqlError);
    else console.log("Campaigns accessible.");

    // Let's try to query public.campaign_logs directly again but catch the full error details
    console.log("SQL Error details if we query campaign_logs:");
    const { data: logs, error: logsError } = await supabase.from('campaign_logs').select('*').limit(1);
    console.log("logsError:", logsError);
  } else {
    console.log("Tables:", data);
  }
}

run();
