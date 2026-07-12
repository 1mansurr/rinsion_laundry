/**
 * utils/normalizeCustomerPhone.ts
 *
 * Canonical form for customers.phone used as input to both encryptField() and
 * computeBlindIndex() (see src/lib/crypto/) — the same normalization must run
 * on every write and every lookup, or the blind index silently never matches.
 *
 * Prefers toAuthPhone()'s strict E.164 normalization (so "0241234567" and
 * "+233241234567" collide to the same blind index, catching duplicates a
 * plain .trim() never would), but falls back to the trimmed raw value for
 * numbers that don't fit toAuthPhone's three known Ghana shapes — confirmed
 * against real data that a meaningful fraction of existing customer phone
 * numbers don't. This is no worse than today's dedup check (a bare
 * `.eq('phone', input.phone.trim())`), just normalizes the common case too.
 */
import { toAuthPhone } from './toAuthPhone'

export function normalizeCustomerPhone(raw: string): string {
  const trimmed = raw.trim()
  return toAuthPhone(trimmed) ?? trimmed
}
