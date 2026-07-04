'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PLANS } from '@/constants/plans'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function createBranch(name: string): Promise<ServiceResult<{ id: string; name: string; branchCode: string }>> {
  if (!name.trim()) return { success: false, error: 'Branch name cannot be empty.' }

  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', userId)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

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
