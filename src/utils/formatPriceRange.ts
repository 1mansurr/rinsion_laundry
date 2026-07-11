import { formatCurrency } from './formatCurrency'

/**
 * utils/formatPriceRange.ts
 *
 * Formats a min/max price pair. Equal values (the common case — a fixed
 * price) collapse to a single figure; a genuine range shows both bounds.
 */

export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatCurrency(min)
  return `GHS ${min.toFixed(2)}–${max.toFixed(2)}`
}
