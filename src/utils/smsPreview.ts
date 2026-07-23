// Keep this in sync with the real order-ready template in
// src/services/notifications/sendOrderReadySms.ts — this is a preview,
// not the message itself, so it needs to stay truthful to what customers
// actually receive.
export function buildOrderReadySmsPreview(laundryName: string) {
  const name = laundryName.trim() || '[Laundry Name]'
  return `${name}: Your order ORD-XXXXXXXX is ready for pickup! Show code XXXX when collecting. We look forward to seeing you.`
}
