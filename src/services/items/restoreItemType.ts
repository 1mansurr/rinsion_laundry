'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function restoreItemType(id: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('item_types')
    .update({ deleted_at: null })
    .eq('id', id)
    .select('laundry_id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${data.laundry_id}`)
  revalidatePath('/items-and-services')
  revalidatePath('/settings/recycle-bin')
  return { success: true, data: null }
}
