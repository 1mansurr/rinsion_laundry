'use server'

import { createAdminClient } from '@/lib/supabase'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { generateInviteToken } from '@/utils/inviteToken'
import type { EmployeeRole } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export type CreateInviteResult =
  | { linked: true }
  | { linked: false; token: string }

/**
 * Internal — not self-gating. Callers (inviteEmployee today; provisionLaundry
 * later) are responsible for authorizing the caller before invoking this.
 */
export async function createInvite(
  laundryId: string,
  rawPhone: string,
  role: EmployeeRole,
  createdBy: string
): Promise<ServiceResult<CreateInviteResult>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  const admin = createAdminClient()

  // Already has an auth account (e.g. staff at another Rinsion laundry) —
  // skip the token entirely and link them in directly.
  const { data: existingUserId } = await admin.rpc('get_auth_user_by_phone', { p_phone: phone })

  if (existingUserId) {
    const branchId = await getSoleBranchId(laundryId, admin)
    if (!branchId) return { success: false, error: 'No branch found for this laundry.' }

    // Best-effort name reuse from any prior employees row for this person —
    // employees.first_name/last_name are NOT NULL and the admin only supplied
    // phone + role, so there's nothing else to fill them with here.
    const { data: priorRow } = await admin
      .from('employees')
      .select('first_name, last_name')
      .eq('auth_user_id', existingUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error: empErr } = await admin.from('employees').insert({
      auth_user_id: existingUserId,
      laundry_id: laundryId,
      branch_id: branchId,
      role,
      first_name: priorRow?.first_name ?? '',
      last_name: priorRow?.last_name ?? '',
      phone,
    })
    if (empErr) return { success: false, error: empErr.message }

    return { success: true, data: { linked: true } }
  }

  const { token, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('pending_invites').insert({
    laundry_id: laundryId,
    phone,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: createdBy,
  })
  if (error) return { success: false, error: error.message }

  return { success: true, data: { linked: false, token } }
}
