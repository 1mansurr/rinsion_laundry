'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PLANS } from '@/constants/plans'
import { ROLES } from '@/constants/statuses'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function getBranchesList(laundryId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('laundry_id', laundryId)
    .order('name')

  return data ?? []
}

export async function createBranch(name: string): Promise<ServiceResult<{ id: string; name: string; branchCode: string }>> {
  if (!name.trim()) return { success: false, error: 'Branch name cannot be empty.' }

  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('laundry_id', emp.laundry_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = (sub?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.branchLimit ?? PLANS.starter.branchLimit

  const { count } = await supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('laundry_id', emp.laundry_id)

  if ((count ?? 0) >= limit) {
    return {
      success: false,
      error: `Your ${plan} plan allows up to ${limit} branch${limit > 1 ? 'es' : ''}. Upgrade to Growth to add more.`,
    }
  }

  const branchCode = generateBranchCode()

  const { data: branch, error } = await supabase
    .from('branches')
    .insert({ laundry_id: emp.laundry_id, branch_code: branchCode, name: name.trim() })
    .select('id, name, branch_code')
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: `Branch "${name.trim()}" (${branchCode}) added`,
  })

  revalidatePath('/settings/branches')
  return { success: true, data: { id: branch.id, name: branch.name, branchCode: branch.branch_code } }
}

function generateBranchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BR-'
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
