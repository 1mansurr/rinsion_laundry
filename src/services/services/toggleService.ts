'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function toggleService(id: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
