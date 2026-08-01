/**
 * utils/toAuthPhone.ts
 *
 * Mirrors src/utils/toAuthPhone.ts in the website repo byte-for-byte — kept
 * as a small duplicated file rather than a shared package (nine lines, no
 * dependencies, not worth a monorepo refactor for). Normalizes a Ghana phone
 * number to E.164 (e.g. "+233241234567"), the format Supabase's phone auth
 * actually matches against for sign-in.
 */
export function toAuthPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.length === 9) return `+233${digits}`

  return null
}
