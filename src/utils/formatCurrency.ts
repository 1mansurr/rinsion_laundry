/**
 * utils/formatCurrency.ts
 *
 * Formats a numeric amount as Ghana Cedis (GHS).
 */

export function formatCurrency(amount: number): string {
  return `GHS ${amount.toFixed(2)}`
}
