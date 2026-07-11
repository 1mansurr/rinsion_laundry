'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'

export interface ItemType {
  id: string
  name: string
  isActive: boolean
}

// Cached 5 min, tag-scoped per laundry — item types are near-static reference
// data for the order form. Mutated only via createItemType/toggleItemType,
// which revalidate the same `reference-data-${laundryId}` tag.
// Uses admin client because unstable_cache runs outside request context (no cookies).
export async function getItemTypes(laundryId: string): Promise<ItemType[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('item_types')
        .select('id, name, is_active')
        .eq('laundry_id', laundryId)
        .is('deleted_at', null)
        .order('name')

      return (data ?? []).map(r => ({ id: r.id, name: r.name, isActive: r.is_active }))
    },
    ['item-types', laundryId],
    { revalidate: 300, tags: [`reference-data-${laundryId}`] },
  )()
}
