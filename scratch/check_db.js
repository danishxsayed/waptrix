const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Checking DB connection & schema...");
  
  // 1. Fetch campaigns
  const { data: campaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .select('*')
    .limit(5);
  
  if (campaignErr) {
    console.error("Campaign query error:", campaignErr);
  } else {
    console.log("CAMPAIGNS:", JSON.stringify(campaigns, null, 2));
  }

  // 2. Fetch wa_connections
  const { data: connections, error: connErr } = await supabase
    .from('wa_connections')
    .select('*')
    .limit(5);

  if (connErr) {
    console.error("Connections query error:", connErr);
  } else {
    console.log("CONNECTIONS:", JSON.stringify(connections, null, 2));
  }

  // 3. Fetch contacts
  const { data: contacts, error: contactErr } = await supabase
    .from('contacts')
    .select('*')
    .limit(5);

  if (contactErr) {
    console.error("Contacts query error:", contactErr);
  } else {
    console.log("CONTACTS:", JSON.stringify(contacts, null, 2));
  }

  // 4. Fetch campaigns count and statuses
  const { data: counts, error: countErr } = await supabase
    .from('campaigns')
    .select('status, id, name, created_at')
    .order('created_at', { ascending: false });

  if (countErr) {
    console.error("Counts query error:", countErr);
  } else {
    console.log("CAMPAIGN STATUSES:", counts);
  }
}

run();
