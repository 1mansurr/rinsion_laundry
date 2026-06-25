/**
 * utils/formatPhoneNumber.ts
 *
 * Normalises Ghanaian phone numbers.
 * Strips non-digits; stores internally without country code prefix
 * (laundries operate within Ghana so local format is sufficient).
 */

/**
 * Returns only the digit characters from a phone string.
 * e.g. '+233 24 123 4567' → '233241234567'
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Formats a raw phone string for display (e.g. '0241234567' → '024 123 4567').
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}
