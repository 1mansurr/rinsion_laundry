'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingMode } from '@/constants/statuses'

export async function setServicePricing(
  serviceId: string,
  pricingMode: PricingMode,
  kgRate: number | null
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  const { error } = await supabase
    .from('services')
    .update({
      pricing_mode: pricingMode,
      kg_rate: pricingMode === 'per_kg' ? kgRate : null,
    })
    .eq('id', serviceId)
    .eq('laundry_id', check.data.laundryId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  revalidatePath('/orders/new')
  return { success: true, data: null }
}
