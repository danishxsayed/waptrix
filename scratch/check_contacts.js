const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const tenantId = '5d3809ef-75ca-4e0b-a301-df33074c5998';
  console.log("Checking segments for tenant:", tenantId);
  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .eq('tenant_id', tenantId);
  console.log("SEGMENTS:", segments);

  console.log("Checking contacts for tenant:", tenantId);
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId);
  console.log("CONTACTS:", contacts);
}

run();
