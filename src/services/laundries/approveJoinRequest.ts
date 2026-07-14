'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { revalidatePath } from 'next/cache'
import { PLANS } from '@/constants/plans'
import { canAddEmployee } from '@/services/subscriptions/canAddEmployee'
import { ROLES, JOIN_REQUEST_STATUS } from '@/constants/statuses'
import type { EmployeeRole } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function approveJoinRequest(
  requestId: string,
  role: EmployeeRole
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

  const { data: request } = await supabase
    .from('join_requests')
    .select('id, auth_user_id, first_name, last_name, email, phone, status')
    .eq('id', requestId)
    .eq('laundry_id', emp.laundry_id)
    .single()
  if (!request) return { success: false, error: 'Request not found.' }
  if (request.status !== JOIN_REQUEST_STATUS.PENDING) return { success: false, error: 'This request has already been resolved.' }

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  // Plan limit check — same guard as adding an employee directly
  const sub = await getActiveSubscription(emp.laundry_id)
  const plan = sub?.plan ?? 'starter'
  const limit = sub?.employeeLimit ?? PLANS.starter.employeeLimit

  if (!(await canAddEmployee(emp.laundry_id, limit))) {
    return { success: false, error: `Your ${plan} plan allows up to ${limit} employees. Upgrade to add more.` }
  }

  const branchId = await getSoleBranchId(emp.laundry_id)
  if (!branchId) return { success: false, error: 'No branch found for this laundry.' }

  // join_requests.email/phone are already ciphertext (see joinLaundry.ts's
  // submitJoinRequest) under the same FIELD_ENCRYPTION_KEY — copy the
  // envelope straight through rather than decrypt-then-reencrypt. A valid
  // `v1:iv:tag:ct` envelope is self-contained and decrypts correctly
  // regardless of which row it lives in.
  const { data: newEmployee, error: empErr } = await supabase
    .from('employees')
    .insert({
      auth_user_id: request.auth_user_id,
      laundry_id: emp.laundry_id,
      branch_id: branchId,
      role,
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.email,
      phone: request.phone,
    })
    .select('id')
    .single()
  if (empErr) return { success: false, error: empErr.message }

  const { error: reqErr } = await supabase
    .from('join_requests')
    .update({ status: JOIN_REQUEST_STATUS.APPROVED, resolved_at: new Date().toISOString(), resolved_by_employee_id: emp.id })
    .eq('id', requestId)
  if (reqErr) return { success: false, error: reqErr.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    target_employee_id: newEmployee.id,
    action_type: 'EMPLOYEE_CREATED',
    description: 'Employee joined via request',
  })

  revalidatePath('/employees')
  return { success: true, data: null }
}
