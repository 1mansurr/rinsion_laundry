import { headers } from 'next/headers'
import type { createClient } from './supabase'
import type { MyProfile } from '@/services/employees/getMyProfile'
import type { EmployeeRole } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

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

/**
 * The single admin-role gate for services. Pass the result of getMyProfile().
 * Collapses "no session", "no active employee row", and "wrong role" into
 * the same ServiceResult shape every write-path service already returns.
 */
export function requireRole(profile: MyProfile | null, role: EmployeeRole): ServiceResult<MyProfile> {
  if (!profile) return { success: false, error: 'Not authenticated.' }
  if (profile.role !== role) return { success: false, error: 'Admin only.' }
  return { success: true, data: profile }
}
