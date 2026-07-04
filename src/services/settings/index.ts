'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generateJoinPin } from '@/utils/generateJoinPin'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingModel } from '@/constants/statuses'

export interface LaundrySettings {
  allowPartialPayments: boolean
  allowExpressOrders: boolean
  requirePickupCode: boolean
  allowCustomerSubmissions: boolean
  pricingModel: PricingModel
  taxRate: number
}

export async function getSettings(): Promise<LaundrySettings | null> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', userId)
    .single()
  if (!emp) return null

  const { data } = await supabase
    .from('settings')
    .select('allow_partial_payments, allow_express_orders, require_pickup_code, allow_customer_submissions, pricing_model, tax_rate')
    .eq('laundry_id', emp.laundry_id)
    .single()

  if (!data) return null
  return {
    allowPartialPayments: data.allow_partial_payments,
    allowExpressOrders: data.allow_express_orders,
    requirePickupCode: data.require_pickup_code,
    allowCustomerSubmissions: data.allow_customer_submissions,
    pricingModel: data.pricing_model,
    taxRate: Number(data.tax_rate),
  }
}

export async function updateSettings(patch: Partial<LaundrySettings>): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', userId)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const dbPatch: Record<string, boolean | string | number> = { updated_at: new Date().toISOString() }
  if (patch.allowPartialPayments !== undefined) dbPatch.allow_partial_payments = patch.allowPartialPayments
  if (patch.allowExpressOrders !== undefined) dbPatch.allow_express_orders = patch.allowExpressOrders
  if (patch.requirePickupCode !== undefined) dbPatch.require_pickup_code = patch.requirePickupCode
  if (patch.allowCustomerSubmissions !== undefined) dbPatch.allow_customer_submissions = patch.allowCustomerSubmissions
  if (patch.pricingModel !== undefined) dbPatch.pricing_model = patch.pricingModel
  if (patch.taxRate !== undefined) dbPatch.tax_rate = patch.taxRate

  const { error } = await supabase
    .from('settings')
    .update(dbPatch)
    .eq('laundry_id', emp.laundry_id)

  if (error) return { success: false, error: error.message }

  // A laundry-wide pricing model switch to a pure mode forces every service
  // to match — otherwise services created before the switch stay stuck on
  // their old mode with no UI able to fix them (ModeToggle only shows in
  // 'mixed'). 'mixed' is left alone: per-service mode is what that mode means.
  if (patch.pricingModel === 'per_kg') {
    await supabase
      .from('services')
      .update({ pricing_mode: 'per_kg' })
      .eq('laundry_id', emp.laundry_id)
  } else if (patch.pricingModel === 'per_item') {
    await supabase
      .from('services')
      .update({ pricing_mode: 'per_item', kg_rate: null })
      .eq('laundry_id', emp.laundry_id)
  }

  const changed = Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')
  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: `Workflow settings updated: ${changed}`,
  })

  revalidatePath('/settings/workflow')
  revalidatePath('/items-and-services')
  return { success: true, data: null }
}

export async function getLaundry(): Promise<{ id: string; name: string; laundryCode: string; joinPin: string } | null> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', userId)
    .single()
  if (!emp) return null

  const { data } = await supabase
    .from('laundries')
    .select('id, name, laundry_code, join_pin')
    .eq('id', emp.laundry_id)
    .single()

  if (!data) return null
  return { id: data.id, name: data.name, laundryCode: data.laundry_code, joinPin: data.join_pin }
}

export async function regenerateJoinPin(): Promise<ServiceResult<{ joinPin: string }>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', userId)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const joinPin = generateJoinPin()
  const { error } = await supabase
    .from('laundries')
    .update({ join_pin: joinPin, updated_at: new Date().toISOString() })
    .eq('id', emp.laundry_id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: 'Join PIN regenerated',
  })

  revalidatePath('/settings')
  return { success: true, data: { joinPin } }
}

export async function updateLaundryName(name: string): Promise<ServiceResult<null>> {
  if (!name.trim()) return { success: false, error: 'Name cannot be empty.' }

  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', userId)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const { error } = await supabase
    .from('laundries')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', emp.laundry_id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: `Laundry name changed to "${name.trim()}"`,
  })

  revalidatePath('/settings/laundry')
  revalidatePath('/dashboard')
  return { success: true, data: null }
}
