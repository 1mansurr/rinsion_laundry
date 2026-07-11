'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function upsertPrice(
  itemTypeId: string,
  serviceId: string,
  price: number
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  const { error } = await supabase
    .from('item_service_prices')
    .upsert(
      { laundry_id: check.data.laundryId, item_type_id: itemTypeId, service_id: serviceId, price, is_active: true },
      { onConflict: 'laundry_id,item_type_id,service_id' }
    )

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${check.data.laundryId}`)
  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
