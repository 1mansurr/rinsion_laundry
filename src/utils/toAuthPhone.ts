/**
 * utils/toAuthPhone.ts
 *
 * Normalizes a Ghana phone number to the format stored on Supabase's
 * `auth.users.phone` column (digits only, full country code, no leading
 * `+` or `0` — e.g. "233241234567"). This is the auth-identity format,
 * NOT the SMS-delivery format.
 *
 * Do not conflate with:
 * - lib/sms/mnotify.ts's local `normalizePhone` — produces the opposite
 *   convention ("0XXXXXXXXX") for the mNotify SMS API.
 * - utils/formatPhoneNumber.ts's `normalizePhone`/`formatPhone` — an
 *   unused display formatter, unrelated to either auth or SMS.
 *
 * Reused by services/employees/acceptInvite.ts (workstream 3) so the phone
 * stored at account creation matches byte-for-byte what's submitted at sign-in.
 */
export function toAuthPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('233')) return digits
  if (digits.length === 10 && digits.startsWith('0')) return `233${digits.slice(1)}`
  if (digits.length === 9) return `233${digits}`

  return null
}
