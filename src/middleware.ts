import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that belong to the marketing site (waptrix.in only)
const MARKETING_PATHS = ['/', '/pricing', '/about', '/contact', '/blog', '/docs', '/privacy', '/terms', '/sitemap.xml', '/robots.txt'];
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
  const supabaseResponse = NextResponse.next({ request })

  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const isAppSubdomain = hostname.startsWith('app.')

  // ── root domain (waptrix.in or localhost) ────────────────────────────────
  if (!isAppSubdomain) {
    // Non-marketing, non-API paths → redirect to app subdomain
    if (!isMarketingPath(pathname) && !pathname.startsWith('/api/')) {
      const url = request.nextUrl.clone()
      url.host = 'app.' + hostname
      return NextResponse.redirect(url)
    }
    // Marketing pages and /api/* on root domain — pass through, no auth needed
    return supabaseResponse
  }

  // ── app subdomain (app.waptrix.in or app.localhost) ───────────────────────

  // Marketing-only pages don't belong on app subdomain → redirect to root domain
  if (isMarketingPath(pathname) && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.host = hostname.replace(/^app\./, '')
    return NextResponse.redirect(url)
  }

  // Create Supabase client with autoRefreshToken: false so getSession() NEVER
  // makes a network call — it only reads + decodes the JWT from cookies locally.
  // This eliminates all timeouts and refresh_token_already_used race conditions.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() { /* read-only in middleware — no cookie writes needed */ },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null

  // Root on app subdomain → dashboard (if authed) or login
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = userId ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  // Protected app route, not logged in → login
  if (!userId && !isAppPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Routes agents are NOT allowed to access
  const AGENT_BLOCKED_PREFIXES = [
    '/campaigns', '/templates', '/media', '/analytics',
    '/settings', '/connect', '/billing', '/automations',
  ];
  const isTeamBlocked = (p: string) => p === '/team' || p.startsWith('/team/');

  // Trial / plan + role enforcement (only for authenticated protected routes)
  if (userId && !isAppPublic(pathname) && pathname !== '/pricing' && !pathname.startsWith('/api/')) {
    const planCookie = request.cookies.get('waptrix_plan_ok')
    const roleCookie = request.cookies.get('waptrix_role')
    const cacheValid = planCookie?.value === userId

    let userRole = roleCookie?.value || 'owner'

    if (!cacheValid) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      const serviceDb = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      )

      const { data: memberRow } = await serviceDb
        .from('team_members')
        .select('role, owner_tenant_id')
        .eq('member_user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      userRole = memberRow ? (memberRow.role as string) : 'owner'
      const isTeamMember = !!memberRow
      const tenantId = memberRow ? memberRow.owner_tenant_id : userId

      const { data: tenant } = await serviceDb
        .from('tenants')
        .select('plan, trial_ends_at, plan_expires_at')
        .eq('id', tenantId)
        .maybeSingle()

      supabaseResponse.cookies.set('waptrix_plan_ok', userId, {
        httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
      })
      supabaseResponse.cookies.set('waptrix_role', userRole, {
        httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
      })

      if (tenant) {
        const now = new Date()
        const isPro = tenant.plan === 'pro' && tenant.plan_expires_at && new Date(tenant.plan_expires_at) > now
        const inTrial = tenant.plan === 'trial' && tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now
        const hasAccess = isPro || inTrial

        if (!hasAccess && !isTeamMember) {
          const url = request.nextUrl.clone()
          url.host = hostname.replace(/^app\./, '')
          url.pathname = '/pricing'
          url.searchParams.set('expired', '1')
          return NextResponse.redirect(url)
        }
      }
    }

    // Agent route protection
    if (userRole === 'agent') {
      const blocked = AGENT_BLOCKED_PREFIXES.some(p => pathname.startsWith(p)) || isTeamBlocked(pathname)
      if (blocked) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
