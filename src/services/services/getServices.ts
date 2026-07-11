'use server'

import { createClient } from '@/lib/supabase'
import type { PricingMode } from '@/constants/statuses'

export interface LaundryService {
  id: string
  name: string
  isActive: boolean
  pricingMode: PricingMode
  /** Rate per kg, only meaningful when pricingMode is 'per_kg'. Null until set. */
  kgRate: number | null
}

export async function getServices(laundryId: string): Promise<LaundryService[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, is_active, pricing_mode, kg_rate')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active,
    pricingMode: r.pricing_mode,
    kgRate: r.kg_rate === null ? null : Number(r.kg_rate),
  }))
}
