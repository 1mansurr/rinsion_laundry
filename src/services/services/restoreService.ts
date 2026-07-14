'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function restoreService(id: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  const subCheck = await requireActiveSubscription(check.data.laundryId)
  if (!subCheck.success) return subCheck

  const { data, error } = await supabase
    .from('services')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('laundry_id', check.data.laundryId)
    .select('laundry_id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${data.laundry_id}`)
  revalidatePath('/items-and-services')
  revalidatePath('/settings/recycle-bin')
  return { success: true, data: null }
}
