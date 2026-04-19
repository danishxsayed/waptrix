const { createServerClient } = require('@supabase/auth-helpers-nextjs');

async function test() {
  try {
    const client = createServerClient(
      'https://example.supabase.co',
      'some-key',
      {
        cookies: {
          getAll: () => [],
          setAll: () => {}
        }
      }
    );
    console.log('Success creating client');
  } catch (err) {
    console.error('Failed to create client:', err);
  }
}

test();
