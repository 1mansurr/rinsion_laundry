'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingMode } from '@/constants/statuses'

export async function setServicePricing(
  serviceId: string,
  pricingMode: PricingMode,
  minKgRate: number | null,
  maxKgRate: number | null,
  notes?: string | null
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  if (pricingMode === 'per_kg' && minKgRate !== null && maxKgRate !== null) {
    if (isNaN(minKgRate) || isNaN(maxKgRate) || minKgRate < 0 || maxKgRate < minKgRate) {
      return { success: false, error: 'Max rate must be greater than or equal to min rate.' }
    }
  }

  const { error } = await supabase
    .from('services')
    .update({
      pricing_mode: pricingMode,
      min_kg_rate: pricingMode === 'per_kg' ? minKgRate : null,
      max_kg_rate: pricingMode === 'per_kg' ? maxKgRate : null,
      notes: pricingMode === 'per_kg' ? (notes?.trim() || null) : null,
    })
    .eq('id', serviceId)
    .eq('laundry_id', check.data.laundryId)

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${check.data.laundryId}`)
  revalidatePath('/items-and-services')
  revalidatePath('/orders/new')
  return { success: true, data: null }
}
