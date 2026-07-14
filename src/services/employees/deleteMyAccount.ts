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

  // Single atomic RPC (delete_my_account_tx, 20240029000000) — the previous
  // SELECT-count-then-UPDATE here had a TOCTOU race where two concurrent
  // self-deletions by a laundry's last two admins could both pass the "an
  // admin remains" check before either committed, zeroing out admins.
  const { data, error } = await supabase.rpc('delete_my_account_tx', {
    p_employee_id: profile.id,
    p_laundry_id: profile.laundryId,
    p_is_admin: profile.role === ROLES.ADMIN,
  })

  if (error) return { success: false, error: error.message }
  if (data?.[0]?.blocked) {
    return {
      success: false,
      error: "You're the only admin. Promote another employee to admin first, or delete the entire laundry account instead.",
    }
  }

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
