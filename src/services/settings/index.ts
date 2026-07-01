'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface LaundrySettings {
  allowPartialPayments: boolean
  allowExpressOrders: boolean
  requirePickupCode: boolean
  allowCustomerSubmissions: boolean
}

export async function getSettings(): Promise<LaundrySettings | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return null

  const { data } = await supabase
    .from('settings')
    .select('allow_partial_payments, allow_express_orders, require_pickup_code, allow_customer_submissions')
    .eq('laundry_id', emp.laundry_id)
    .single()

  if (!data) return null
  return {
    allowPartialPayments: data.allow_partial_payments,
    allowExpressOrders: data.allow_express_orders,
    requirePickupCode: data.require_pickup_code,
    allowCustomerSubmissions: data.allow_customer_submissions,
  }
}

export async function updateSettings(patch: Partial<LaundrySettings>): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const dbPatch: Record<string, boolean | string> = { updated_at: new Date().toISOString() }
  if (patch.allowPartialPayments !== undefined) dbPatch.allow_partial_payments = patch.allowPartialPayments
  if (patch.allowExpressOrders !== undefined) dbPatch.allow_express_orders = patch.allowExpressOrders
  if (patch.requirePickupCode !== undefined) dbPatch.require_pickup_code = patch.requirePickupCode
  if (patch.allowCustomerSubmissions !== undefined) dbPatch.allow_customer_submissions = patch.allowCustomerSubmissions

  const { error } = await supabase
    .from('settings')
    .update(dbPatch)
    .eq('laundry_id', emp.laundry_id)

  if (error) return { success: false, error: error.message }

  const changed = Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')
  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: `Workflow settings updated: ${changed}`,
  })

  revalidatePath('/settings/workflow')
  return { success: true, data: null }
}

export async function getLaundry(): Promise<{ id: string; name: string; laundryCode: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return null

  const { data } = await supabase
    .from('laundries')
    .select('id, name, laundry_code')
    .eq('id', emp.laundry_id)
    .single()

  if (!data) return null
  return { id: data.id, name: data.name, laundryCode: data.laundry_code }
}

export async function updateLaundryName(name: string): Promise<ServiceResult<null>> {
  if (!name.trim()) return { success: false, error: 'Name cannot be empty.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', user.id)
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
