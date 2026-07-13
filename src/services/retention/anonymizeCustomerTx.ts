'use server'

import { createAdminClient } from '@/lib/supabase'
import { encryptField, decryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import type { ServiceResult } from '@/types/serviceResult'

const SENTINEL_PHONE = '0000000000'

export interface AnonymizeCustomerOptions {
  /** No PII — e.g. 'scheduled retention purge' or 'erasure request fulfilled'.
   *  Becomes part of the anonymize_customer_tx RPC's own activity_logs entry. */
  triggerDescription: string
  erasureRequestId?: string
  platformAdminId?: string
}

/**
 * Low-level wrapper around the anonymize_customer_tx RPC — shared by both
 * triggers (the scheduled retention purge and on-request erasure). This
 * function is deliberately NOT self-authorizing: it trusts its caller.
 * Callers (src/services/retention/runScheduledAnonymization.ts,
 * src/services/platform/fulfillErasureRequest.ts) are responsible for
 * verifying authorization BEFORE calling this — the underlying RPC runs
 * SECURITY DEFINER under service_role with no RLS backstop at all.
 * See docs/deletion_retention_plan.md §4.
 */
export async function anonymizeCustomerTx(
  customerId: string,
  options: AnonymizeCustomerOptions
): Promise<ServiceResult<null>> {
  const admin = createAdminClient()

  const { data: customer, error: fetchErr } = await admin
    .from('customers')
    .select('first_name, last_name, phone, deleted_at')
    .eq('id', customerId)
    .maybeSingle()
  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!customer) return { success: false, error: 'Customer not found.' }

  // anonymize_customer_tx requires deleted_at IS NOT NULL. The on-request
  // trigger can target a customer who hasn't been soft-deleted yet — satisfy
  // the precondition inline rather than requiring a separate prior step.
  if (!customer.deleted_at) {
    const { error: softDeleteErr } = await admin
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', customerId)
    if (softDeleteErr) return { success: false, error: softDeleteErr.message }
  }

  const oldPhonePlain = decryptField(customer.phone) ?? customer.phone
  const anonPhone = normalizeCustomerPhone(SENTINEL_PHONE)

  const { error } = await admin.rpc('anonymize_customer_tx', {
    p_customer_id: customerId,
    p_anon_phone_ct: encryptField(anonPhone),
    p_anon_phone_bidx: computeBlindIndex(`anonymized:${customerId}`),
    p_old_first_name: customer.first_name,
    p_old_last_name: customer.last_name,
    p_old_phone_plain: oldPhonePlain,
    p_trigger_description: options.triggerDescription,
    p_erasure_request_id: options.erasureRequestId ?? null,
    p_platform_admin_id: options.platformAdminId ?? null,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
