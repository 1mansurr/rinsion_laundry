import { headers } from 'next/headers'
import type { createClient } from './supabase'
import type { MyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { WRITE_BLOCKED_STATUSES } from '@/constants/subscriptionStatuses'
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

/**
 * The single subscription-status gate for write paths. Call after auth/role
 * checks, with the caller's laundryId, before any mutation that grows or
 * runs the laundry's operation (orders, payments, pricing edits, staff
 * additions). Every write path must call this directly — a locked laundry
 * blocked from one path but not another is exactly the gap this closes.
 */
export async function requireActiveSubscription(laundryId: string): Promise<ServiceResult<null>> {
  const subscription = await getActiveSubscription(laundryId)
  if (!subscription) return { success: false, error: 'No active subscription. Contact Rinsion support.' }
  if (WRITE_BLOCKED_STATUSES.includes(subscription.status)) {
    return { success: false, error: 'Account is blocked. Please renew your subscription.' }
  }
  return { success: true, data: null }
}
