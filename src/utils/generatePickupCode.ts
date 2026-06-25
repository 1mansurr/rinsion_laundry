/**
 * utils/generatePickupCode.ts
 *
 * Generates a 5-digit numeric pickup code for an order.
 * Codes are random — uniqueness per-order is not required globally.
 * The (order_id, pickup_code) pairing is what matters for verification.
 *
 * Spec reference: Rinsion_Database_Diagram.md → Pickup Code Generation
 */

/**
 * Returns a zero-padded 5-digit string (e.g. '04729', '99999', '00001').
 */
export function generatePickupCode(): string {
  const code = Math.floor(Math.random() * 100000)
  return code.toString().padStart(5, '0')
}
