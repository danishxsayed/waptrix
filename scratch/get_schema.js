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
    console.log("PostgREST OpenAPI spec paths:");
    console.log(Object.keys(res.data.paths).filter(path => !path.includes('/rpc/')));
  } catch (err) {
    console.error("Error fetching schema:", err.response ? err.response.data : err.message);
  }
}

run();
