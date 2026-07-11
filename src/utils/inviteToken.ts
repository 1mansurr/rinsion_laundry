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
