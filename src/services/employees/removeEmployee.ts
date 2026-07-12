'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Stronger than toggleEmployee's deactivate: this un-links the employee from
 * the laundry entirely (their next getMyProfile() call resolves to null, so
 * they get bounced to /signup/choose on their next page load) rather than
 * just greying them out on the team list. Reversible via restoreEmployee /
 * the Recycle Bin — never hard-deletes the row or their auth.users account.
 */
export async function removeEmployee(employeeId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = { id: check.data.id, laundry_id: check.data.laundryId }
  if (caller.id === employeeId) return { success: false, error: 'Use "Delete my account" to remove yourself.' }

  const { data: target, error } = await supabase
    .from('employees')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', employeeId)
    .eq('laundry_id', caller.laundry_id)
    .select('first_name, last_name')
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundry_id,
    employee_id: caller.id,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_REMOVED,
    description: `${target.first_name} ${target.last_name} removed from the team`,
  })

  // Access revocation must take effect immediately, not after the
  // getMyProfile() cache's 5-minute TTL — same reasoning as toggleEmployee.
  revalidateTag('employee-profile')
  revalidatePath('/employees')
  return { success: true, data: null }
}
