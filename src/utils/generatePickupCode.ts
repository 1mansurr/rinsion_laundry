/**
 * utils/generatePickupCode.ts
 *
 * Generates a 6-char alphanumeric pickup code for an order, using the same
 * unambiguous charset as generateOrderNumber() and generateTempPassword().
 * Unique per laundry among non-deleted orders — createOrder() retries on
 * conflict.
 *
 * Spec reference: Rinsion_Database_Diagram.md → Pickup Code Generation
 */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePickupCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  return code
}
