'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import type { PricingMode } from '@/constants/statuses'

export interface LaundryService {
  id: string
  name: string
  isActive: boolean
  pricingMode: PricingMode
  /** Rate per kg, only meaningful when pricingMode is 'per_kg'. Null until set. Equal to maxKgRate for a fixed rate. */
  minKgRate: number | null
  maxKgRate: number | null
  notes: string | null
}

// Cached 5 min, tag-scoped per laundry — services are near-static reference
// data for the order form. Mutated only via createService/setServicePricing/
// toggleService, which revalidate the same `reference-data-${laundryId}` tag.
// Uses admin client because unstable_cache runs outside request context (no cookies).
export async function getServices(laundryId: string): Promise<LaundryService[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('services')
        .select('id, name, is_active, pricing_mode, min_kg_rate, max_kg_rate, notes')
        .eq('laundry_id', laundryId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        isActive: r.is_active,
        pricingMode: r.pricing_mode,
        minKgRate: r.min_kg_rate === null ? null : Number(r.min_kg_rate),
        maxKgRate: r.max_kg_rate === null ? null : Number(r.max_kg_rate),
        notes: r.notes,
      }))
    },
    ['services', laundryId],
    { revalidate: 300, tags: [`reference-data-${laundryId}`] },
  )()
}
