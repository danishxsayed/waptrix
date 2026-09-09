import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Derive the shared cookie domain so server-set cookies match the domain the
 * browser Supabase client uses (domain=.waptrix.in / domain=localhost).
 * This prevents duplicate same-name cookies on different domains that cause
 * stale-session conflicts after re-login.
 */
function getCookieDomain(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  try {
    const hostname = new URL(appUrl).hostname;
    if (!hostname || hostname === 'localhost' || hostname.startsWith('127.')) return undefined;
    // ".waptrix.in" — shared across app.waptrix.in and waptrix.in
    const parts = hostname.split('.');
    return '.' + parts.slice(-2).join('.');
  } catch {
    return undefined;
  }
}

export async function createClient() {
  const cookieStore = await cookies()
  const domain = getCookieDomain()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, ...(domain ? { domain } : {}) })
            )
          } catch {}
        },
      },
    }
  )
}
