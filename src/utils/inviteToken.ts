import { randomBytes, createHash } from 'crypto'

/**
 * 16 random bytes -> base64url (~22 chars, all single-char GSM-7) per
 * docs/auth_spec.md §6. Only the SHA-256 hash is ever persisted — the raw
 * token exists solely in memory long enough to build the SMS link.
 */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(16).toString('base64url')
  return { token, tokenHash: hashInviteToken(token) }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * 6-digit numeric code for phone password reset (src/services/auth/phoneReset.ts)
 * — short enough to read out of an SMS and type back in, unlike the base64url
 * invite token above which is meant to go in a tappable link. Hashed the same
 * way; only the hash is ever persisted.
 */
export function generateResetCode(): { code: string; codeHash: string } {
  const code = randomBytes(4).readUInt32BE(0).toString().slice(-6).padStart(6, '0')
  return { code, codeHash: hashInviteToken(code) }
}
