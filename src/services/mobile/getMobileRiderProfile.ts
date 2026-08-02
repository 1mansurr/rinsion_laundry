import type { NextRequest } from 'next/server'
import { createAdminClient, verifyMobileToken } from '@/lib/supabase'
import type { RiderRole } from '@/constants/statuses'

export interface MobileRiderProfile {
  userId: string
  riderId: string
  riderCompanyId: string
  role: RiderRole
  firstName: string
  lastName: string
}

interface RiderRow {
  id: string
  rider_company_id: string
  role: string
  first_name: string
  last_name: string
  rider_companies: { is_active: boolean } | null
}

/**
 * Extracts + verifies the mobile app's Authorization: Bearer token, then
 * resolves the caller's riders row — the API-route equivalent of
 * services/riders/getMyRiderProfile.ts, which relies on a cookie session this
 * request context doesn't have. Mirrors getMobileEmployeeProfile.ts exactly,
 * including getMyRiderProfile.ts's rider_companies.is_active check (a
 * deactivated company means no profile, same as an inactive/deleted rider).
 */
export async function getMobileRiderProfile(request: NextRequest): Promise<MobileRiderProfile | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) return null

  const userId = await verifyMobileToken(token)
  if (!userId) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('riders')
    .select('id, rider_company_id, role, first_name, last_name, rider_companies(is_active)')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  const rider = data as unknown as RiderRow | null
  if (!rider) return null
  if (rider.rider_companies?.is_active === false) return null

  return {
    userId,
    riderId: rider.id,
    riderCompanyId: rider.rider_company_id,
    role: rider.role as RiderRole,
    firstName: rider.first_name,
    lastName: rider.last_name,
  }
}
