import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtwhdnggxtjnvwxgclsk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d2hkbmdneHRqbnZ3eGdjbHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMTgxMywiZXhwIjoyMDkyMDg3ODEzfQ.UtqVsO_w3cY38sE33Gez99oNsCVdIwtBo7u-EDOfkLY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTemplates() {
  const { data, error } = await supabase.from('templates').select('tenant_id').limit(1);
  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }
  console.log('Sample tenant_id:', data[0]?.tenant_id);
}

checkTemplates();
