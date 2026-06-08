const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Fetching message_logs structure/records...");
  const { data, error } = await supabase
    .from('message_logs')
    .select('*')
    .limit(5);

  if (error) {
    console.error("Error fetching message_logs:", error);
  } else {
    console.log("MESSAGE LOGS:", JSON.stringify(data, null, 2));
  }
}

run();
