'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Self-service — any employee (admin or not) can delete their own account.
 * No requireRole gate: this acts only on the caller's own row.
 *
 * Never hard-deletes auth.users: employees.auth_user_id has no ON DELETE
 * clause (RESTRICT by default), and the row must keep existing — soft-
 * deleted, not gone — for the Recycle Bin to have anything to restore.
 * Deleting the auth user here would just fail with an FK violation anyway.
 */
export async function deleteMyAccount(): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  if (profile.role === ROLES.ADMIN) {
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('role', ROLES.ADMIN)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('id', profile.id)

    if (!count) {
      return {
        success: false,
        error: "You're the only admin. Promote another employee to admin first, or delete the entire laundry account instead.",
      }
    }
  }

  const { error } = await supabase
    .from('employees')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', profile.id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_SELF_DELETED,
    description: 'Employee deleted their own account',
  })

  revalidateTag('employee-profile')
  await supabase.auth.signOut()

  return { success: true, data: null }
}
