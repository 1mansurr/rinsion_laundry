/**
 * lib/supabase.ts
 *
 * The only file in the codebase allowed to import @supabase/supabase-js or
 * @supabase/ssr for a server-side client. All service functions obtain
 * clients from here.
 *
 * Two clients are exported:
 *  - createClient()      — server-side client, respects RLS (uses anon key + cookies)
 *  - createAdminClient() — service-role client, bypasses RLS for internal admin use only
 *
 * One narrow exception: lib/supabaseBrowser.ts holds the browser-side client
 * (anon key only, no cookies() access) — this file imports next/headers,
 * which cannot be pulled into a client component's bundle, so a genuinely
 * browser-safe client can't live here.
 *
 * Spec reference: Rinsion_Technical_Overview.md §19 (Supabase Isolation Rule)
 */

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Returns a Supabase client bound to the current request's cookie session.
 * RLS policies are enforced — every query is scoped to the authenticated employee's laundry.
 * Use this in all service functions that run under a user session.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookie writes are no-ops.
            // The middleware handles session refresh.
          }
        },
      },
    }
  )
}

/**
 * Returns a Supabase client using the service-role key.
 * Bypasses RLS — only for privileged operations where the acting user's
 * identity/authorization has already been verified via createClient() first:
 *   - services/admin/ (internal Rinsion staff, gated by the email allowlist)
 *   - bootstrapping a brand new tenant (self-serve laundry creation, joining
 *     by PIN) where no laundry_id exists yet for tenant-scoped RLS to key off
 *   - creating a new employee's auth user (admin-privileged, not self-serve)
 * Never expose this client to browser code, and never use it before verifying
 * the caller via the regular session client.
 *
 * Spec reference: Rinsion_Technical_Overview.md §21 (Developer Dashboard implementation notes)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  )
}

/**
 * Verifies the mobile app's Supabase access token and returns the
 * authenticated user id, or null. The React Native app has no cookie jar
 * (createClient() above needs one) — it sends its session's access token in
 * an Authorization: Bearer header instead, same identity space as the
 * website (see mobile/src/lib/supabase.ts). Used by src/app/api/mobile/*
 * route handlers, which then look up the caller's employees/riders row
 * themselves via createAdminClient() — there is no cookie-bound RLS session
 * to piggyback on here, so those lookups are scoped explicitly rather than
 * left to RLS, same pattern already used throughout services/riders/.
 */
export async function verifyMobileToken(accessToken: string): Promise<string | null> {
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await anon.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user.id
}

/**
 * Shared client type so service functions that accept an injectable client
 * (e.g. getSoleBranchId, used both under a session and, unauthenticated,
 * from acceptInvite) can type that parameter without importing
 * @supabase/supabase-js themselves.
 */
export type DbClient = ReturnType<typeof createAdminClient>
