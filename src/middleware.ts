import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that belong to the marketing site (waptrix.in only)
const MARKETING_PATHS = ['/', '/pricing', '/about', '/contact', '/blog', '/docs', '/privacy', '/terms'];
const MARKETING_PREFIXES = ['/blog/', '/docs/'];

// Routes that are public on app.waptrix.in (no auth needed)
const APP_PUBLIC_PATHS = ['/login', '/signup', '/accept-invite', '/forgot-password', '/reset-password'];
const APP_PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/webhooks/',
  '/api/payments/',
  '/api/team/invite',
  '/api/team/create-account',
];

function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.includes(pathname)) return true;
  if (MARKETING_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return false;
}

function isAppPublic(pathname: string): boolean {
  if (APP_PUBLIC_PATHS.includes(pathname)) return true;
  if (APP_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (pathname.includes('/process-batch')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const isAppSubdomain = hostname.startsWith('app.')

  // ── waptrix.in (root domain) ──────────────────────────────────────────────
  // Any non-marketing path on waptrix.in → redirect to app.waptrix.in
  if (!isAppSubdomain && !isMarketingPath(pathname)) {
    const url = request.nextUrl.clone()
    url.host = 'app.' + hostname  // e.g. app.waptrix.in
    return NextResponse.redirect(url)
  }

  // ── app.waptrix.in ────────────────────────────────────────────────────────
  if (isAppSubdomain) {
    // Marketing-only pages don't belong on app subdomain → redirect to waptrix.in
    if (isMarketingPath(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.host = hostname.replace(/^app\./, '')
      return NextResponse.redirect(url)
    }

    // Root on app subdomain → dashboard (if authed) or login
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/dashboard' : '/login'
      return NextResponse.redirect(url)
    }

    // Protected app route, not logged in → login
    if (!user && !isAppPublic(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
