/**
 * constants/internalAdmins.ts
 *
 * Hardcoded email allowlist for the Rinsion internal Developer Dashboard.
 * Only emails in this list can access routes under /app/internal/.
 *
 * This is a compile-time constant, not a database table. Adding a new internal
 * admin requires a code change and redeploy — which is intentional.
 *
 * Spec reference: Rinsion_Technical_Overview.md §5, §21 (Internal Admin Access)
 */

export const INTERNAL_ADMIN_EMAILS: readonly string[] = [
  'saymmmohammed265@gmail.com',
] as const
