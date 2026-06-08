const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
  };

  try {
    const res = await axios.get(url, { headers });
    const schema = res.data.definitions.message_logs;
    console.log("message_logs definition:", JSON.stringify(schema, null, 2));
  } catch (err) {
    console.error("Error fetching table schema:", err.response ? err.response.data : err.message);
  }
}

run();
