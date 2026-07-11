'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function toggleEmployee(employeeId: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = { id: check.data.id, laundry_id: check.data.laundryId }
  if (caller.id === employeeId) return { success: false, error: 'Cannot deactivate your own account.' }

  const { error } = await supabase
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', employeeId)
    .eq('laundry_id', caller.laundry_id)

  if (error) return { success: false, error: error.message }

  // Deactivation must take effect immediately, not after the getMyProfile()
  // cache's 5-minute TTL — every write-path service gates on that cached profile.
  revalidateTag('employee-profile')
  revalidatePath('/employees')
  return { success: true, data: null }
}
