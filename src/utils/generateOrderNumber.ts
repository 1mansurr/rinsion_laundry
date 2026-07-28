/**
 * utils/generateOrderNumber.ts
 *
 * Generates an "ORD-XXXXXXXX" order number, using the same unambiguous
 * charset as generatePickupCode()/generateTempPassword(). Lives outside any
 * 'use server' file — Next.js requires every export from a 'use server' file
 * to be an async Server Action, and this is a plain sync helper reused by
 * both createOrder.ts (staff) and submitCustomerOrder.ts (customer).
 */
export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ORD-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
