const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/templates/route.ts',
  'src/app/api/templates/[id]/route.ts',
  'src/app/api/campaigns/route.ts',
  'src/app/api/contacts/route.ts',
  'src/app/api/analytics/route.ts',
  'src/app/api/dashboard/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/whatsapp/store-token/route.ts',
  'src/app/api/whatsapp/connect/route.ts',
  'src/app/api/whatsapp/sync-connection/route.ts'
];

const workspacePath = '/Users/danishsayed/Desktop/Waptrix';

files.forEach(relativePath => {
  const fullPath = path.join(workspacePath, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Remove old imports
  content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+['"]@\/lib\/supabase\/server['"];?\n?/g, '');
  content = content.replace(/import\s+{\s*createRouteHandlerClient\s*}\s+from\s+['"]@supabase\/auth-helpers-nextjs['"];?\n?/g, '');
  
  // Also remove existing cookies import if it exists to avoid duplicates
  content = content.replace(/import\s+{\s*cookies\s*}\s+from\s+['"]next\/headers['"];?\n?/g, '');
  content = content.replace(/import\s+{\s*createServerClient\s*}\s+from\s+['"]@supabase\/ssr['"];?\n?/g, '');
  content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+['"]@supabase\/supabase-js['"];?\n?/g, '');

  // 2. Add new imports right below export const dynamic or at the top if dynamic doesn't exist
  const importsToAdd = `import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'\n`;
  
  if (content.includes('export const dynamic = "force-dynamic";')) {
    content = content.replace('export const dynamic = "force-dynamic";', 'export const dynamic = "force-dynamic";\n\n' + importsToAdd);
  } else if (content.includes("export const dynamic = 'force-dynamic'")) {
    content = content.replace("export const dynamic = 'force-dynamic'", "export const dynamic = 'force-dynamic'\n\n" + importsToAdd);
  } else {
    // just prepend it
    content = importsToAdd + '\n' + content;
  }

  // 3. Replace Auth logic
  // Case A: old server route logic
  const oldAuthPattern1 = /const\s+supabase\s*=\s*await\s+createClient\(\);\s*\n\s*const\s+{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\);/g;
  
  // Case B: auth-helpers-nextjs pattern
  const oldAuthPattern2 = /const\s+cookieStore\s*=\s*cookies\(\)\s*\n\s*const\s+supabase\s*=\s*createRouteHandlerClient\({[^}]*}\)\s*\n\s*const\s+{\s*data:\s*{\s*session\s*}\s*}\s*=\s*await\s+supabase\.auth\.getSession\(\)/g;
  
  // Case C: auth-helpers-nextjs with user
  const oldAuthPattern3 = /const\s+cookieStore\s*=\s*cookies\(\)\s*\n\s*const\s+supabase\s*=\s*createRouteHandlerClient\({[^}]*}\)\s*\n\s*const\s+{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\)/g;

  const newAuthLogic = `const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await ssrClient.auth.getUser()`;

  content = content.replace(oldAuthPattern1, newAuthLogic);
  
  // For patterns where `session` is used, we need to map `session.user` to `user` below
  if (content.match(oldAuthPattern2)) {
    content = content.replace(oldAuthPattern2, newAuthLogic);
    // replace `!session?.user` with `!user`
    content = content.replace(/!session\?.user/g, '!user');
    // replace `session.user.id` with `user.id`
    content = content.replace(/session\.user\.id/g, 'user.id');
    // replace `session?.user?.id` with `user?.id`
    content = content.replace(/session\?\.user\?\.id/g, 'user?.id');
  }

  if (content.match(oldAuthPattern3)) {
    content = content.replace(oldAuthPattern3, newAuthLogic);
  }

  // Replace manual session extraction directly
  content = content.replace(/const\s+cookieStore\s*=\s*cookies\(\)[\s\S]*?const\s+{\s*data:\s*{\s*session\s*}\s*}\s*=\s*await\s+supabase\.auth\.getSession\(\)/g, newAuthLogic);

  // Replace manual user extraction from supabase server client
  content = content.replace(/const\s+supabase\s*=\s*await\s+createClient\(\)[\s\S]*?const\s+{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\)/g, newAuthLogic);

  // Again fix session usages if any got missed
  content = content.replace(/!session\?.user/g, '!user');
  content = content.replace(/session\.user\.id/g, 'user.id');
  content = content.replace(/session\?\.user\?\.id/g, 'user?.id');

  // 4. Replace Service Client logic
  const oldServicePattern = /const\s*{\s*createClient:\s*createServiceClient\s*}\s*=\s*await\s*import\(['"]@supabase\/supabase-js['"]\);\s*\n\s*const\s+serviceClient\s*=\s*createServiceClient\([^)]+\);/g;
  
  const oldServicePattern2 = /const\s+serviceClient\s*=\s*createClient\([^)]+\)/g;

  const newServiceLogic = `const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )`;
  
  // For files that use dynamic import for service client
  content = content.replace(oldServicePattern, newServiceLogic);

  // For files that already use createClient directly, let's just make sure they match newLogic
  // But wait, oldServicePattern2 would match our newly inserted newServiceLogic if we aren't careful.
  // Actually, let's just replace all instantiations of createClient with serviceClient (if it has 2 args)
  content = content.replace(/const\s+serviceClient\s*=\s*createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_KEY!\s*\);?/g, newServiceLogic);

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Processed: ${relativePath}`);
});
