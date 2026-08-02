import type { NextRequest } from 'next/server'
import { createAdminClient, verifyMobileToken } from '@/lib/supabase'
import type { EmployeeRole } from '@/constants/statuses'

export interface MobileEmployeeProfile {
  userId: string
  employeeId: string
  laundryId: string
  branchId: string
  role: EmployeeRole
  firstName: string
  lastName: string
}

/**
 * Extracts + verifies the mobile app's Authorization: Bearer token, then
 * resolves the caller's employees row — the API-route equivalent of
 * services/employees/getMyProfile.ts, which relies on a cookie session this
 * request context doesn't have. Every src/app/api/mobile/* route calls this
 * first; null means respond 401 (bad/missing token) or 403 (valid account,
 * not an employee — e.g. a rider hitting a laundry-only endpoint).
 */
export async function getMobileEmployeeProfile(request: NextRequest): Promise<MobileEmployeeProfile | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) return null

  const userId = await verifyMobileToken(token)
  if (!userId) return null

  const admin = createAdminClient()
  const { data: employee } = await admin
    .from('employees')
    .select('id, laundry_id, branch_id, role, first_name, last_name')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (!employee) return null

  return {
    userId,
    employeeId: employee.id,
    laundryId: employee.laundry_id,
    branchId: employee.branch_id,
    role: employee.role as EmployeeRole,
    firstName: employee.first_name,
    lastName: employee.last_name,
  }
}
