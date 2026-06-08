const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Checking template bec9dae2-47be-4a0a-b8f2-1fb8f9ea5c21...");
  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', 'bec9dae2-47be-4a0a-b8f2-1fb8f9ea5c21')
    .single();

  if (error) {
    console.error("Template fetch error:", error);
    return;
  }

  console.log("Template ID:", template.id);
  console.log("Template Name:", template.name);
  console.log("Language code stored locally:", template.language);
  console.log("Template components:", JSON.stringify(template.components, null, 2));

  // Let's also check the wa_connections details
  const { data: connection } = await supabase
    .from('wa_connections')
    .select('*')
    .eq('tenant_id', '5d3809ef-75ca-4e0b-a301-df33074c5998')
    .single();

  if (connection) {
    console.log("Syncing template status from Meta Graph API...");
    const axios = require('axios');
    try {
      const res = await axios.get(`https://graph.facebook.com/v19.0/${connection.waba_id}/message_templates`, {
        headers: { Authorization: `Bearer ${connection.access_token}` }
      });
      console.log("Active templates on Meta WABA account:");
      res.data.data.forEach(t => {
        console.log(`- Name: "${t.name}" | Language: "${t.language}" | Status: "${t.status}"`);
      });
    } catch (err) {
      console.error("Error querying templates from Meta:", err.response ? err.response.data : err.message);
    }
  }
}

run();
