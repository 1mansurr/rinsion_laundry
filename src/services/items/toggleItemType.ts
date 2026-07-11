'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function toggleItemType(id: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('item_types')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('laundry_id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${data.laundry_id}`)
  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
