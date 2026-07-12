/**
 * lib/crypto/fieldEncryption.ts
 *
 * Application-level field encryption for personal-data columns (customers.phone,
 * employees.email/phone) — a layer on top of Supabase's own at-rest encryption,
 * so a leaked SUPABASE_SERVICE_ROLE_KEY or raw DB/SQL access doesn't hand out
 * plaintext PII.
 *
 * Storage format: a single TEXT string `v1:<iv>:<authTag>:<ciphertext>` (all
 * base64) — no column type change needed. AES-256-GCM, random 12-byte IV per
 * value (so encrypting the same phone number twice never produces the same
 * ciphertext), authenticated (tamper-evident).
 *
 * decryptField() is deliberately tolerant of legacy plaintext (anything not
 * starting with the `v1:` envelope is returned as-is) so read-side code can
 * ship before every existing row has been backfilled to ciphertext, without a
 * separate "has this row been migrated" branch at every call site.
 *
 * Requires env vars (server-only, never NEXT_PUBLIC_):
 *   FIELD_ENCRYPTION_KEY — 32 random bytes, base64 (openssl rand -base64 32)
 *   BLIND_INDEX_KEY       — 32 random bytes, base64, distinct from the above
 *
 * If either key is lost, data encrypted with it is permanently unrecoverable —
 * there is no rotation or recovery path built. Keys must live outside the repo
 * (mirror wherever SUPABASE_SERVICE_ROLE_KEY is stored for production).
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

const ENVELOPE_PREFIX = 'v1:'
const IV_LENGTH = 12 // bytes, standard for GCM

function getEncryptionKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) throw new Error('FIELD_ENCRYPTION_KEY is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must decode to 32 bytes')
  return key
}

function getBlindIndexKey(): Buffer {
  const raw = process.env.BLIND_INDEX_KEY
  if (!raw) throw new Error('BLIND_INDEX_KEY is not set')
  return Buffer.from(raw, 'base64')
}

/** Encrypts a plaintext value for storage. Returns the `v1:...` envelope string. */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [ENVELOPE_PREFIX.slice(0, -1), iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

/**
 * Decrypts a stored value. Values without the `v1:` envelope are treated as
 * legacy plaintext and returned unchanged — see file header.
 */
export function decryptField(stored: string | null): string | null {
  if (stored === null) return null
  if (!stored.startsWith(ENVELOPE_PREFIX)) return stored

  try {
    const [, ivB64, authTagB64, ciphertextB64] = stored.split(':')
    const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
    return plaintext.toString('utf8')
  } catch (err) {
    logger.error('fieldEncryption: decryptField failed', err)
    throw new Error('Failed to decrypt field — data may be corrupted or FIELD_ENCRYPTION_KEY is wrong.')
  }
}

/**
 * Deterministic, non-reversible HMAC-SHA256 of a normalized value — enables
 * exact-match lookups (uniqueness checks, search-by-full-phone) on an
 * encrypted column without ever storing or querying plaintext. Callers must
 * normalize the input themselves (e.g. toAuthPhone()) so the same logical
 * value always produces the same blind index.
 */
export function computeBlindIndex(normalizedValue: string): string {
  return createHmac('sha256', getBlindIndexKey()).update(normalizedValue).digest('hex')
}
