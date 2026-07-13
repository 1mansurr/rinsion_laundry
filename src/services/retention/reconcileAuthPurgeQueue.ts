'use server'

import { createAdminClient } from '@/lib/supabase'
import { attemptAuthUserDeletion } from './anonymizeEmployeeTx'
import { AUTH_PURGE_RETRY } from '@/constants/retention'

export interface ReconcileResult {
  retried: number
  errors: string[]
}

/**
 * Retries pending auth_identity_purge_queue rows — the durable record of
 * "this auth.users row still needs deleting" written transactionally by
 * anonymize_employee_tx. Always safe to run regardless of how the TBD
 * retention windows are configured: this isn't a retention decision, it's
 * finishing an already-committed anonymization whose out-of-transaction
 * admin.auth.admin.deleteUser() call failed the first time.
 * See docs/deletion_retention_plan.md §7.
 */
export async function reconcileAuthPurgeQueue(): Promise<ReconcileResult> {
  const admin = createAdminClient()
  const backoffCutoff = new Date(Date.now() - AUTH_PURGE_RETRY.backoffMinutes * 60 * 1000).toISOString()

  const { data: pending, error } = await admin
    .from('auth_identity_purge_queue')
    .select('auth_user_id, attempts, attempted_at')
    .is('completed_at', null)
    .lt('attempts', AUTH_PURGE_RETRY.maxAttempts)
    .or(`attempted_at.is.null,attempted_at.lt.${backoffCutoff}`)
    .order('requested_at', { ascending: true })

  if (error) return { retried: 0, errors: [error.message] }
  if (!pending?.length) return { retried: 0, errors: [] }

  const errors: string[] = []
  for (const row of pending) {
    try {
      await attemptAuthUserDeletion(row.auth_user_id)
    } catch (err) {
      errors.push(`auth_user_id ${row.auth_user_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { retried: pending.length, errors }
}
