/**
 * types/itemServicePrice.ts
 *
 * TypeScript types for the item_service_prices table (the pricing matrix).
 * Spec reference: Rinsion_Database_Diagram.md → item_service_prices
 */

import type { PricingMode } from '@/constants/statuses'

export interface ItemServicePrice {
  id: string
  laundryId: string
  itemTypeId: string
  serviceId: string
  price: number
  pricingMode: PricingMode
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SetPriceInput {
  laundryId: string
  itemTypeId: string
  serviceId: string
  price: number
  pricingMode: PricingMode
}

/**
 * The pricing matrix as a nested map for efficient lookup during order creation.
 * Keyed by itemTypeId → serviceId → price.
 */
export type PricingMatrix = Record<string, Record<string, number>>
