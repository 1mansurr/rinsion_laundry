'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface ItemType {
  id: string
  name: string
  isActive: boolean
}

export async function getItemTypes(laundryId: string): Promise<ItemType[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('item_types')
    .select('id, name, is_active')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('name')

  return (data ?? []).map(r => ({ id: r.id, name: r.name, isActive: r.is_active }))
}

export async function createItemType(name: string): Promise<ServiceResult<ItemType>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, 'admin')
  if (!check.success) return check

  const { data, error } = await supabase
    .from('item_types')
    .insert({ laundry_id: check.data.laundryId, name: name.trim() })
    .select('id, name, is_active')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: { id: data.id, name: data.name, isActive: data.is_active } }
}

export async function toggleItemType(id: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('item_types')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
