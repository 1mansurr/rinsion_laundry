'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ROLES, JOIN_REQUEST_STATUS } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function rejectJoinRequest(requestId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

  const { error } = await supabase
    .from('join_requests')
    .update({ status: JOIN_REQUEST_STATUS.REJECTED, resolved_at: new Date().toISOString(), resolved_by_employee_id: emp.id })
    .eq('id', requestId)
    .eq('laundry_id', emp.laundry_id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/employees')
  return { success: true, data: null }
}
