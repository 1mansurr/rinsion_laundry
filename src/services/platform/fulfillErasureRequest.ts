'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { anonymizeCustomerTx } from '@/services/retention/anonymizeCustomerTx'
import { anonymizeEmployeeTx } from '@/services/retention/anonymizeEmployeeTx'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Trigger 2 of the two anonymize_*_tx triggers (docs/deletion_retention_plan.md
 * §4) — on-request erasure for an Act 843 data-subject request. Platform-
 * admin-only, invoked from the internal Rinsion dashboard, never gated on
 * the retention window. Deliberately not reachable from the tenant-facing
 * app — no self-serve "erase now" action exists or is planned (Rev 4
 * changelog).
 *
 * requirePlatformAdmin() below is the ENTIRE authorization boundary for this
 * call path — there is no RLS backstop, since anonymize_customer_tx /
 * anonymize_employee_tx run SECURITY DEFINER under service_role and bypass
 * tenant_isolation entirely. Only this function and the scheduled-purge
 * cron (src/services/retention/runScheduledAnonymization.ts) may ever call
 * anonymizeCustomerTx/anonymizeEmployeeTx — do not add a third call path
 * without threading the same kind of authorization check through first.
 */
export async function fulfillErasureRequest(requestId: string): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()

  const { data: request, error: fetchErr } = await admin
    .from('erasure_requests')
    .select('id, laundry_id, subject_type, subject_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle()
  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!request) return { success: false, error: 'Request not found or already resolved.' }

  // Defensive data-integrity check, not an authorization check — platform
  // admins are legitimately cross-tenant by design (platform_admins has no
  // laundry_id of its own, see 20240010000000's RLS comment). Confirms the
  // (subject_id, laundry_id, subject_type) triple is internally consistent
  // before anonymizing anything.
  const subjectTable = request.subject_type === 'customer' ? 'customers' : 'employees'
  const { data: subject, error: subjectErr } = await admin
    .from(subjectTable)
    .select('id, laundry_id')
    .eq('id', request.subject_id)
    .maybeSingle()
  if (subjectErr) return { success: false, error: subjectErr.message }
  if (!subject || subject.laundry_id !== request.laundry_id) {
    return { success: false, error: "Subject does not match the request's laundry — refusing to proceed." }
  }

  const options = {
    triggerDescription: 'erasure request fulfilled',
    erasureRequestId: requestId,
    platformAdminId,
  }

  const result = request.subject_type === 'customer'
    ? await anonymizeCustomerTx(request.subject_id, options)
    : await anonymizeEmployeeTx(request.subject_id, options)

  if (!result.success) return result

  const { error: resolveErr } = await admin
    .from('erasure_requests')
    .update({ status: 'completed', resolved_by: platformAdminId, resolved_at: new Date().toISOString() })
    .eq('id', requestId)
  if (resolveErr) return { success: false, error: resolveErr.message }

  return { success: true, data: null }
}
