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

  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const isAppSubdomain = hostname.startsWith('app.')

  // ── root domain (waptrix.in or localhost) ────────────────────────────────
  // Non-marketing paths on the root domain → redirect to app subdomain
  if (!isAppSubdomain && !isMarketingPath(pathname) && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.host = 'app.' + hostname  // e.g. app.waptrix.in or app.localhost:3001
    return NextResponse.redirect(url)
  }

  // Marketing paths on root domain — no auth needed, return immediately
  // (navbar uses /api/me client-side, no need for getUser() here)
  if (!isAppSubdomain && (isMarketingPath(pathname) || pathname.startsWith('/api/'))) {
    return supabaseResponse
  }

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
          const h = request.headers.get('host') || ''
          const baseDomain = h.replace(/^app\./, '').split(':')[0]
          const isLocal = baseDomain === 'localhost' || baseDomain === '127.0.0.1'
          const cookieDomain = isLocal
            ? 'localhost'
            : '.' + baseDomain.split('.').slice(-2).join('.')
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── app subdomain (app.waptrix.in or app.localhost) ───────────────────────
  if (isAppSubdomain) {
    // Marketing-only pages don't belong on app subdomain → redirect to root domain
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
    // NOTE: use exact segment boundaries — '/team' must NOT match '/team-chat'
    const AGENT_BLOCKED_PREFIXES = [
      '/campaigns', '/templates', '/media', '/analytics',
      '/settings', '/connect', '/billing', '/automations',
    ];
    // Team pages blocked for agents (exact path or sub-paths like /team/...) but NOT /team-chat
    const isTeamBlocked = (p: string) => p === '/team' || p.startsWith('/team/');

    // Trial / plan + role enforcement
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
        const isTeamMember = !!memberRow
        const tenantId = memberRow ? memberRow.owner_tenant_id : user.id

        const { data: tenant } = await serviceDb
          .from('tenants')
          .select('plan, trial_ends_at, plan_expires_at')
          .eq('id', tenantId)
          .maybeSingle()

        // Always cache role so subsequent requests don't hit DB again
        supabaseResponse.cookies.set('waptrix_plan_ok', user.id, {
          httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
        })
        supabaseResponse.cookies.set('waptrix_role', userRole, {
          httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax',
        })

        if (tenant) {
          const now       = new Date()
          const isPro     = tenant.plan === 'pro' && tenant.plan_expires_at && new Date(tenant.plan_expires_at) > now
          const inTrial   = tenant.plan === 'trial' && tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now
          const hasAccess = isPro || inTrial

          // Only owners/admins get the pricing redirect — agents are not responsible for billing
          if (!hasAccess && !isTeamMember) {
            const url = request.nextUrl.clone()
            url.host = hostname.replace(/^app\./, '')
            url.pathname = '/pricing'
            url.searchParams.set('expired', '1')
            return NextResponse.redirect(url)
          }
        }
      }

      // Agent route protection — redirect to dashboard if accessing restricted page
      if (userRole === 'agent') {
        const blocked = AGENT_BLOCKED_PREFIXES.some(p => pathname.startsWith(p)) || isTeamBlocked(pathname)
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
