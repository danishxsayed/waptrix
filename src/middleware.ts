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
  if (!isAppSubdomain && !isMarketingPath(pathname) && !pathname.startsWith('/api/')) {
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

    // Routes agents are NOT allowed to access
    const AGENT_BLOCKED_PREFIXES = [
      '/campaigns', '/templates', '/media', '/analytics',
      '/settings', '/connect', '/billing', '/team', '/automations',
    ];

    // Trial / plan + role enforcement — cache results in cookies to avoid DB hit on every request
    if (user && !isAppPublic(pathname) && pathname !== '/pricing' && !pathname.startsWith('/api/')) {
      const planCookie  = request.cookies.get('waptrix_plan_ok')
      const roleCookie  = request.cookies.get('waptrix_role')
      const cacheValid  = planCookie?.value === user.id

      let userRole = roleCookie?.value || 'owner'

      if (!cacheValid) {
        // Only hit DB when no valid cookie exists (first visit or cookie expired)
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        const serviceDb = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )

        // Check team member role
        const { data: memberRow } = await serviceDb
          .from('team_members')
          .select('role, owner_tenant_id')
          .eq('member_user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        userRole = memberRow ? (memberRow.role as string) : 'owner'
        const tenantId = memberRow ? memberRow.owner_tenant_id : user.id

        const { data: tenant } = await serviceDb
          .from('tenants')
          .select('plan, trial_ends_at, plan_expires_at')
          .eq('id', tenantId)
          .maybeSingle()

        if (tenant) {
          const now      = new Date()
          const isPro    = tenant.plan === 'pro' && tenant.plan_expires_at && new Date(tenant.plan_expires_at) > now
          const inTrial  = tenant.plan === 'trial' && tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now
          const hasAccess = isPro || inTrial

          if (!hasAccess) {
            const url = request.nextUrl.clone()
            url.host = hostname.replace(/^app\./, '')
            url.pathname = '/pricing'
            url.searchParams.set('expired', '1')
            return NextResponse.redirect(url)
          }

          // Cache plan + role for 5 minutes
          supabaseResponse.cookies.set('waptrix_plan_ok', user.id, {
            httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
          })
          supabaseResponse.cookies.set('waptrix_role', userRole, {
            httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
          })
        }
      }

      // Agent route protection — redirect to dashboard if accessing restricted page
      if (userRole === 'agent') {
        const blocked = AGENT_BLOCKED_PREFIXES.some(p => pathname.startsWith(p))
        if (blocked) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
