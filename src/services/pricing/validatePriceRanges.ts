import type { DbClient } from '@/lib/supabase'
import type { PricingMode } from '@/constants/statuses'

export interface PriceableItem {
  itemTypeId?: string
  serviceId: string
  unitPrice: number
  pricingMode: PricingMode
}

export interface PriceRangeError {
  index: number
  error: string
}

/**
 * Validates every submitted unit price against the live pricing tables —
 * closes the gap where a client could otherwise submit an arbitrary price.
 * Factored out of createOrder.ts (staff, employee picks a price within the
 * range) so submitCustomerOrder.ts (customer, always submits the range
 * ceiling — see its own comment for why) can reuse the identical rule rather
 * than duplicating it. Takes the caller's own client so RLS still applies for
 * staff callers (session client) while the customer path can pass its admin
 * client.
 */
export async function validatePriceRanges(
  client: DbClient,
  laundryId: string,
  items: PriceableItem[]
): Promise<PriceRangeError | null> {
  const perItemItems = items.filter(i => i.pricingMode !== 'per_kg')
  const perKgServiceIds = Array.from(new Set(items.filter(i => i.pricingMode === 'per_kg').map(i => i.serviceId)))
  const itemTypeIds = Array.from(new Set(perItemItems.map(i => i.itemTypeId).filter((id): id is string => !!id)))
  const perItemServiceIds = Array.from(new Set(perItemItems.map(i => i.serviceId)))

  const [{ data: priceRows }, { data: kgRows }] = await Promise.all([
    itemTypeIds.length > 0
      ? client
          .from('item_service_prices')
          .select('item_type_id, service_id, min_price, max_price')
          .eq('laundry_id', laundryId)
          .eq('is_active', true)
          .in('item_type_id', itemTypeIds)
          .in('service_id', perItemServiceIds)
      : Promise.resolve({ data: [] as { item_type_id: string; service_id: string; min_price: number; max_price: number }[] }),
    perKgServiceIds.length > 0
      ? client
          .from('services')
          .select('id, min_kg_rate, max_kg_rate')
          .eq('laundry_id', laundryId)
          .in('id', perKgServiceIds)
      : Promise.resolve({ data: [] as { id: string; min_kg_rate: number | null; max_kg_rate: number | null }[] }),
  ])

  const priceByKey = new Map(
    (priceRows ?? []).map(r => [`${r.item_type_id}:${r.service_id}`, { min: Number(r.min_price), max: Number(r.max_price) }])
  )
  const kgRateById = new Map(
    (kgRows ?? []).map(r => [r.id, { min: r.min_kg_rate !== null ? Number(r.min_kg_rate) : null, max: r.max_kg_rate !== null ? Number(r.max_kg_rate) : null }])
  )

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.pricingMode === 'per_kg') {
      const rate = kgRateById.get(item.serviceId)
      if (!rate || rate.min === null || rate.max === null) {
        return { index: i, error: 'Price not found for the selected service. Refresh and try again.' }
      }
      if (!priceWithinRange(item.unitPrice, rate.min, rate.max)) {
        return { index: i, error: `Price must be between GHS ${rate.min.toFixed(2)} and GHS ${rate.max.toFixed(2)} (submitted GHS ${item.unitPrice.toFixed(2)}).` }
      }
    } else {
      if (!item.itemTypeId) return { index: i, error: 'Missing item type for a per-item line.' }
      const range = priceByKey.get(`${item.itemTypeId}:${item.serviceId}`)
      if (!range) {
        return { index: i, error: 'Price not found for the selected item. Refresh and try again.' }
      }
      if (!priceWithinRange(item.unitPrice, range.min, range.max)) {
        return { index: i, error: `Price must be between GHS ${range.min.toFixed(2)} and GHS ${range.max.toFixed(2)} (submitted GHS ${item.unitPrice.toFixed(2)}).` }
      }
    }
  }

  return null
}

// Integer-cents comparison avoids float rounding false-positives against DECIMAL(10,2) columns.
function priceWithinRange(value: number, min: number, max: number): boolean {
  const cents = Math.round(value * 100)
  return cents >= Math.round(min * 100) && cents <= Math.round(max * 100)
}
