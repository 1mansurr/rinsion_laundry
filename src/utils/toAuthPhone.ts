/**
 * utils/toAuthPhone.ts
 *
 * Normalizes a Ghana phone number to E.164 (full country code, leading
 * `+`, e.g. "+233241234567") — the format Supabase's phone auth actually
 * matches against for sign-in. This is the auth-identity format, NOT the
 * SMS-delivery format.
 *
 * Confirmed empirically (not just from SDK docs): a bare digits-only value
 * with no `+` let account creation succeed but silently broke every
 * subsequent sign-in (both the auto-sign-in in acceptInvite and manual
 * /login) with "invalid phone or password" — Supabase's phone lookup does
 * not treat "233..." and "+233..." as equivalent.
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

  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.length === 9) return `+233${digits}`

  return null
}
