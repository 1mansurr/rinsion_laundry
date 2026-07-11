'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'

export interface PriceCell {
  id: string
  itemTypeId: string
  serviceId: string
  price: number
  isActive: boolean
}

// Cached 5 min, tag-scoped per laundry — the pricing matrix is near-static
// reference data for the order form. Mutated only via upsertPrice/togglePrice
// (and importPricing, which calls through those), which revalidate the same
// `reference-data-${laundryId}` tag.
// Uses admin client because unstable_cache runs outside request context (no cookies).
export async function getPricingMatrix(laundryId: string): Promise<PriceCell[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('item_service_prices')
        .select('id, item_type_id, service_id, price, is_active')
        .eq('laundry_id', laundryId)

      return (data ?? []).map(r => ({
        id: r.id,
        itemTypeId: r.item_type_id,
        serviceId: r.service_id,
        price: Number(r.price),
        isActive: r.is_active,
      }))
    },
    ['pricing-matrix', laundryId],
    { revalidate: 300, tags: [`reference-data-${laundryId}`] },
  )()
}
