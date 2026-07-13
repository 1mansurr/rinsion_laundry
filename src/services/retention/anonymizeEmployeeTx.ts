'use server'

import { createAdminClient } from '@/lib/supabase'
import { encryptField, decryptField } from '@/lib/crypto'
import type { ServiceResult } from '@/types/serviceResult'

const SENTINEL_PHONE_PLAIN = '0000000000000'

export interface AnonymizeEmployeeOptions {
  /** No PII — e.g. 'scheduled retention purge' or 'erasure request fulfilled'.
   *  Becomes part of the anonymize_employee_tx RPC's own activity_logs entry. */
  triggerDescription: string
  erasureRequestId?: string
  platformAdminId?: string
}

/**
 * Low-level wrapper around the anonymize_employee_tx RPC — shared by both
 * triggers (the scheduled retention purge and on-request erasure). Like
 * anonymizeCustomerTx, this is NOT self-authorizing — callers
 * (runScheduledAnonymization.ts, fulfillErasureRequest.ts) must verify
 * authorization first. See docs/deletion_retention_plan.md §4.
 *
 * Also owns the two-step auth.users neutralization (§7): the RPC detaches
 * employees.auth_user_id and writes a durable auth_identity_purge_queue row
 * transactionally; this function then attempts the actual
 * admin.auth.admin.deleteUser() call outside that transaction, best-effort.
 * If that call fails, the queue row is left pending for
 * reconcileAuthPurgeQueue.ts to retry later — no identity is left forgotten.
 */
export async function anonymizeEmployeeTx(
  employeeId: string,
  options: AnonymizeEmployeeOptions
): Promise<ServiceResult<null>> {
  const admin = createAdminClient()

  const { data: employee, error: fetchErr } = await admin
    .from('employees')
    .select('first_name, last_name, phone, deleted_at')
    .eq('id', employeeId)
    .maybeSingle()
  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!employee) return { success: false, error: 'Employee not found.' }

  // anonymize_employee_tx requires deleted_at IS NOT NULL. The on-request
  // trigger can target an employee who hasn't been soft-deleted yet —
  // satisfy the precondition inline.
  if (!employee.deleted_at) {
    const { error: softDeleteErr } = await admin
      .from('employees')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', employeeId)
    if (softDeleteErr) return { success: false, error: softDeleteErr.message }
  }

  const oldPhonePlain = decryptField(employee.phone) ?? employee.phone

  const { data: detachedAuthUserId, error } = await admin.rpc('anonymize_employee_tx', {
    p_employee_id: employeeId,
    p_anon_phone_ct: encryptField(SENTINEL_PHONE_PLAIN),
    p_old_first_name: employee.first_name,
    p_old_last_name: employee.last_name,
    p_old_phone_plain: oldPhonePlain,
    p_trigger_description: options.triggerDescription,
    p_erasure_request_id: options.erasureRequestId ?? null,
    p_platform_admin_id: options.platformAdminId ?? null,
  })

  if (error) return { success: false, error: error.message }

  if (detachedAuthUserId) {
    await attemptAuthUserDeletion(detachedAuthUserId as string)
  }

  return { success: true, data: null }
}

/** Exported for reuse by the reconciliation retry job. */
export async function attemptAuthUserDeletion(authUserId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(authUserId)

  // A 404 here means the identity is already gone — treat as success rather
  // than a failure to retry forever (e.g. a prior attempt succeeded but the
  // bookkeeping call below never landed because the process crashed).
  const success = !error || error.status === 404

  await admin.rpc('record_auth_purge_attempt', {
    p_auth_user_id: authUserId,
    p_success: success,
    p_error: success ? null : error!.message,
  })
}
