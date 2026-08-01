import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Builds a pass-through response that forwards the verified user ID to server
// components via a request header, avoiding a second auth.getUser() call there.
// Copies any Supabase session cookies from the base response so token refreshes
// aren't lost.
function withUserId(base: NextResponse, request: NextRequest, userId: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-user-id') // strip any client-supplied value
  requestHeaders.set('x-user-id', userId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  base.cookies.getAll().forEach(({ name, value, ...rest }) => {
    response.cookies.set(name, value, rest)
  })
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and getClaims.
  // A simple mistake will make it very hard to debug session issues.
  // getClaims() verifies the JWT locally against the cached JWKS (this project
  // uses asymmetric ES256 signing keys), avoiding a network round trip to the
  // Auth server on every request that getUser() would require.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ? { id: data.claims.sub } : null

  const { pathname } = request.nextUrl

  // Mobile app API routes (src/app/api/mobile/*): the React Native app has
  // no cookie jar, so it authenticates with an Authorization: Bearer header
  // instead — verified inside each route via getMobileEmployeeProfile(),
  // not here. Every other branch below redirects a cookie-less request to
  // /login, which would otherwise turn every mobile API call into an HTML
  // redirect response instead of JSON.
  if (pathname.startsWith('/api/mobile/')) {
    return supabaseResponse
  }

  // /internal and /platform both require platform_admins clearance, checked
  // server-side in their own layouts (needs the service-role client, which
  // stays out of middleware) — here they just need a valid session, same as
  // every other authenticated route below.

  if (pathname.startsWith('/login')) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Password recovery: reachable signed-out (request the link, exchange the
  // code) and signed-in for the brief recovery session set up by the code
  // exchange, so no auth gating here — each route/page handles its own case.
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/auth/callback')) {
    return supabaseResponse
  }

  // Signup is reachable both signed-out (the initial form) and signed-in but
  // not yet an employee (choose/add-laundry/join-laundry) — each page checks
  // its own precondition and redirects, so just let it through here.
  if (pathname.startsWith('/signup')) {
    return supabaseResponse
  }

  // Invite accept page: the invitee has no session at all — possession of
  // the token is the authorization, validated server-side in acceptInvite.
  if (pathname.startsWith('/i/')) {
    return supabaseResponse
  }

  // Let / through — app/page.tsx handles the redirect
  if (pathname === '/') {
    return supabaseResponse
  }

  // Public legal pages, linked from the landing page footer signed-out
  if (pathname.startsWith('/terms') || pathname.startsWith('/privacy')) {
    return supabaseResponse
  }

  // Rider invite accept page: same reasoning as /i/ above — the token is
  // the authorization, validated server-side in acceptRiderInvite.
  if (pathname.startsWith('/ri/')) {
    return supabaseResponse
  }

  // Rider platform: a separate auth surface from staff /login and the
  // customer /portal (see services/riders/). An authenticated employee or
  // customer session still counts as "a session" here — the actual
  // rider-vs-other-tenant distinction is checked page-side via
  // getMyRiderProfile(), same pattern as the portal. Must come before the
  // generic !user redirect below, or a signed-out rider would be bounced to
  // the staff /login page instead of /rider/login.
  if (pathname.startsWith('/rider/login')) {
    if (user) {
      return NextResponse.redirect(new URL('/rider', request.url))
    }
    return supabaseResponse
  }

  if (pathname.startsWith('/rider')) {
    if (!user) {
      const redirectUrl = new URL('/rider/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return withUserId(supabaseResponse, request, user.id)
  }

  // Customer portal: a separate auth surface from staff /login (see
  // services/customerAuth/). An authenticated employee session still counts
  // as "a session" here — the actual employee-vs-customer distinction is
  // checked in (portal)/portal/layout.tsx via getMyCustomerProfile(), not
  // here. Must come before the generic !user redirect below, or a
  // signed-out portal visitor would be bounced to the staff /login page.
  if (pathname.startsWith('/portal/login')) {
    if (user) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    return supabaseResponse
  }

  if (pathname.startsWith('/portal')) {
    if (!user) {
      const redirectUrl = new URL('/portal/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return withUserId(supabaseResponse, request, user.id)
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return withUserId(supabaseResponse, request, user.id)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
