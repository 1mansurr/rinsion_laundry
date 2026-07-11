'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { LaundrySettings } from './getSettings'

export async function updateSettings(patch: Partial<LaundrySettings>): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

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
    revalidateTag(`reference-data-${emp.laundry_id}`)
  } else if (patch.pricingModel === 'per_item') {
    await supabase
      .from('services')
      .update({ pricing_mode: 'per_item', min_kg_rate: null, max_kg_rate: null })
      .eq('laundry_id', emp.laundry_id)
    revalidateTag(`reference-data-${emp.laundry_id}`)
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
