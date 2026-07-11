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
