import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build-time prerender the env vars are not available.
    // Returning a no-op proxy prevents the build from crashing.
    // At runtime these will always be defined.
    if (typeof window === 'undefined') {
      return { auth: { getUser: async () => ({ data: { user: null } }) } } as any;
    }
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  // Set cookie domain so session is shared across subdomains:
  //   localhost   → domain=localhost   (shared with app.localhost)
  //   waptrix.in  → domain=.waptrix.in (shared with app.waptrix.in)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const cookieDomain = isLocal
    ? 'localhost'
    : '.' + hostname.split('.').slice(-2).join('.');  // e.g. ".waptrix.in"

  return createBrowserClient(url, key, {
    cookieOptions: { domain: cookieDomain },
  });
}
