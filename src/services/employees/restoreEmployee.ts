'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function restoreEmployee(employeeId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = { id: check.data.id, laundry_id: check.data.laundryId }

  const subCheck = await requireActiveSubscription(caller.laundry_id)
  if (!subCheck.success) return subCheck

  const { error } = await supabase
    .from('employees')
    .update({ deleted_at: null, is_active: true })
    .eq('id', employeeId)
    .eq('laundry_id', caller.laundry_id)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundry_id,
    employee_id: caller.id,
    target_employee_id: employeeId,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_RESTORED,
    description: 'Employee restored to the team',
  })

  revalidateTag('employee-profile')
  revalidatePath('/employees')
  revalidatePath('/settings/recycle-bin')
  return { success: true, data: null }
}
