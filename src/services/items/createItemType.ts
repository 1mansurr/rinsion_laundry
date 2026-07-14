'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { ItemType } from './getItemTypes'

export async function createItemType(name: string): Promise<ServiceResult<ItemType>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  const subCheck = await requireActiveSubscription(check.data.laundryId)
  if (!subCheck.success) return subCheck

  const { data, error } = await supabase
    .from('item_types')
    .insert({ laundry_id: check.data.laundryId, name: name.trim() })
    .select('id, name, is_active')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${check.data.laundryId}`)
  revalidatePath('/items-and-services')
  return { success: true, data: { id: data.id, name: data.name, isActive: data.is_active } }
}
