'use server'

import { createClient } from '@/lib/supabase'

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
