'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { createInvite } from '@/services/employees/createInvite'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { canAddEmployee } from '@/services/subscriptions/canAddEmployee'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { PLANS } from '@/constants/plans'
import type { EmployeeRole } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface InviteEmployeeInput {
  phone: string
  role: EmployeeRole
}

export async function inviteEmployee(input: InviteEmployeeInput): Promise<ServiceResult<{ linked: boolean }>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = check.data

  const subscription = await getActiveSubscription(caller.laundryId)
  const limit = subscription?.employeeLimit ?? PLANS.starter.employeeLimit
  if (!(await canAddEmployee(caller.laundryId, limit))) {
    return { success: false, error: `Your ${subscription?.plan ?? 'current'} plan allows up to ${limit} employees. Upgrade to add more.` }
  }

  const result = await createInvite(caller.laundryId, input.phone, input.role, caller.id)
  if (!result.success) return result

  const supabase = createClient()
  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundryId,
    employee_id: caller.id,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_INVITED,
    description: result.data.linked
      ? `Existing account linked as ${input.role}`
      : `Invite sent as ${input.role}`,
  })

  // Deferred SMS — fires after the invite/link write above has committed, never before.
  if (!result.data.linked) {
    const token = result.data.token
    const laundryName = caller.laundryName
    // Captured synchronously (within the request) since headers() isn't safe
    // to call once we're inside the deferred .then() below.
    const baseUrl = getBaseUrl()
    import('@/services/notifications/sendSms')
      .then(m => m.sendSystemSms({
        laundryId: caller.laundryId,
        phone: input.phone,
        message: `${laundryName} added you as staff on Rinsion. Set your password: ${baseUrl}/i/${token}`,
        triggerEvent: 'EMPLOYEE_INVITE',
      }))
      .catch(() => null)
  }

  revalidatePath('/employees')
  return { success: true, data: { linked: result.data.linked } }
}
