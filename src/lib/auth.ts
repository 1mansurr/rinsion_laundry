import { headers } from 'next/headers'
import type { createClient } from './supabase'

type SessionClient = ReturnType<typeof createClient>

/**
 * Returns the authenticated user's id without a redundant network round trip.
 * Middleware already verifies the JWT (via getClaims()) and forwards the id
 * through the x-user-id header — read that first. Falls back to
 * auth.getUser() for paths middleware doesn't cover (e.g. direct invocations).
 */
export async function getVerifiedUserId(supabase: SessionClient): Promise<string | null> {
  const headerUserId = headers().get('x-user-id')
  if (headerUserId) return headerUserId

  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
