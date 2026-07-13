'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import type { ServiceResult } from '@/types/serviceResult'

export interface CreateErasureRequestInput {
  laundryId: string
  subjectType: 'customer' | 'employee'
  subjectId: string
  /** Internal note only (e.g. "Act 843 request via support ticket #1234") —
   *  never shown to the tenant. Free text — same incidental-PII caveat as
   *  order_notes, see docs/deletion_retention_plan.md §3/§4. */
  reason?: string
}

/**
 * Intake step for an on-request erasure (docs/deletion_retention_plan.md
 * §4) — platform-admin only, records that a request was received, separate
 * from actually fulfilling it (fulfillErasureRequest.ts). Deliberately
 * never reachable from the tenant-facing app.
 */
export async function createErasureRequest(
  input: CreateErasureRequestInput
): Promise<ServiceResult<{ id: string }>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('erasure_requests')
    .insert({
      laundry_id: input.laundryId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      reason: input.reason ?? null,
      requested_by: platformAdminId,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: data.id } }
}
