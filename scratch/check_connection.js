const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log("Checking wa_connections for tenant 5d3809ef-75ca-4e0b-a301-df33074c5998...");
  const { data: connection, error } = await supabase
    .from('wa_connections')
    .select('*')
    .eq('tenant_id', '5d3809ef-75ca-4e0b-a301-df33074c5998')
    .single();

  if (error) {
    console.error("Connection fetch error:", error);
    return;
  }

  console.log("Connection ID:", connection.id);
  console.log("Phone Number ID:", connection.phone_number_id);
  console.log("WABA ID:", connection.waba_id);
  console.log("Access Token starts with:", connection.access_token ? connection.access_token.substring(0, 15) + "..." : "null");
  console.log("Access Token length:", connection.access_token ? connection.access_token.length : 0);
  
  // Let's test the token against Meta API directly using axios
  const axios = require('axios');
  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${connection.phone_number_id}`, {
      headers: { Authorization: `Bearer ${connection.access_token}` }
    });
    console.log("Meta API Response for phone ID lookup:", res.data);
  } catch (err) {
    console.error("Meta API error during phone ID lookup verification:", err.response ? err.response.data : err.message);
  }
}

run();
