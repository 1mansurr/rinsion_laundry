/**
 * lib/crypto/index.ts
 *
 * Barrel for application-level field encryption. See fieldEncryption.ts for
 * the storage format, key requirements, and rollout notes.
 */

export { encryptField, decryptField, computeBlindIndex } from './fieldEncryption'
