'use server'

import { createClient } from '@/lib/supabase'

export interface PriceCell {
  id: string
  itemTypeId: string
  serviceId: string
  price: number
  isActive: boolean
}

export async function getPricingMatrix(laundryId: string): Promise<PriceCell[]> {
  const supabase = createClient()
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
}
