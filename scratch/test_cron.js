const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCron() {
  console.log("Fetching queued campaigns with templates join...");
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*, templates(*)')
    .in('status', ['SCHEDULED', 'queued', 'scheduled'])
    .lte('scheduled_at', new Date().toISOString())
    .limit(10);

  if (error) {
    console.error("Error executing query:", error);
    return;
  }
  
  console.log("Retrieved campaigns:", campaigns.length);
  for (const c of campaigns) {
    console.log(`Campaign name: ${c.name}`);
    console.log(`templates:`, c.templates);
  }
}

testCron();
