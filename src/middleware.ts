import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { INTERNAL_ADMIN_EMAILS } from '@/constants/internalAdmins'

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

  // IMPORTANT: Do not add logic between createServerClient and getUser.
  // A simple mistake will make it very hard to debug session issues.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/internal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!INTERNAL_ADMIN_EMAILS.includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return withUserId(supabaseResponse, request, user.id)
  }

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
