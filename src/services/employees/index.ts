'use server'

import { createAdminClient, createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PLANS } from '@/constants/plans'
import type { EmployeeRole } from '@/constants/statuses'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: EmployeeRole
  branchId: string
  branchName: string
  isActive: boolean
}

export interface CreateEmployeeInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: EmployeeRole
  branchId: string
}

export async function getEmployees(): Promise<Employee[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, phone, role, branch_id, is_active, branches(name)')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    role: r.role as EmployeeRole,
    branchId: r.branch_id,
    branchName: (r.branches as unknown as { name: string } | null)?.name ?? '',
    isActive: r.is_active,
  }))
}

export async function createEmployee(input: CreateEmployeeInput): Promise<ServiceResult<{ tempPassword: string }>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, 'admin')
  if (!check.success) return check
  const caller = { id: check.data.id, laundry_id: check.data.laundryId }

  // Plan limit check
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('laundry_id', caller.laundry_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = (sub?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.employeeLimit ?? PLANS.starter.employeeLimit

  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('laundry_id', caller.laundry_id)
    .eq('is_active', true)

  if ((count ?? 0) >= limit) {
    return {
      success: false,
      error: `Your ${plan} plan allows up to ${limit} employees. Upgrade to add more.`,
    }
  }

  // Create auth user via admin client
  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) return { success: false, error: authErr.message }

  const { error: empErr } = await admin
    .from('employees')
    .insert({
      auth_user_id: authData.user.id,
      laundry_id: caller.laundry_id,
      branch_id: input.branchId,
      role: input.role,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
    })

  if (empErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: empErr.message }
  }

  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundry_id,
    employee_id: caller.id,
    action_type: 'EMPLOYEE_CREATED',
    description: `Employee ${input.firstName} ${input.lastName} (${input.email}) added`,
  })

  revalidatePath('/employees')
  return { success: true, data: { tempPassword } }
}

export async function toggleEmployee(employeeId: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, 'admin')
  if (!check.success) return check
  const caller = { id: check.data.id, laundry_id: check.data.laundryId }
  if (caller.id === employeeId) return { success: false, error: 'Cannot deactivate your own account.' }

  const { error } = await supabase
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', employeeId)
    .eq('laundry_id', caller.laundry_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/employees')
  return { success: true, data: null }
}

export async function getBranches(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({ id: r.id, name: r.name }))
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}
