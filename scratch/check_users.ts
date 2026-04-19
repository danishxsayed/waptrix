import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtwhdnggxtjnvwxgclsk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d2hkbmdneHRqbnZ3eGdjbHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMTgxMywiZXhwIjoyMDkyMDg3ODEzfQ.UtqVsO_w3cY38sE33Gez99oNsCVdIwtBo7u-EDOfkLY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  console.log('Users found:', users.map(u => ({ id: u.id, email: u.email })));
}

checkUsers();
