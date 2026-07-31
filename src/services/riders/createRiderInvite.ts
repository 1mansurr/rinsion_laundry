'use server'

import { createAdminClient } from '@/lib/supabase'
import { encryptField } from '@/lib/crypto'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { generateInviteToken } from '@/utils/inviteToken'
import type { RiderRole } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export type CreateRiderInviteResult =
  | { linked: true }
  | { linked: false; token: string }

/**
 * Internal — not self-gating, mirrors services/employees/createInvite.ts.
 * Callers (inviteRider today; provisionRiderCompany for a company's first
 * admin) are responsible for authorizing the caller first.
 */
export async function createRiderInvite(
  riderCompanyId: string,
  rawPhone: string,
  role: RiderRole,
  createdByRiderId: string | null
): Promise<ServiceResult<CreateRiderInviteResult>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  const admin = createAdminClient()

  // Already has an auth account (e.g. an employee, customer, or rider at
  // another company with the same phone) — link directly, no token needed.
  // Same reasoning as createInvite.ts: auth.users is one shared identity
  // space across every tenant type in this codebase.
  const { data: existingUserId } = await admin.rpc('get_auth_user_by_phone', { p_phone: phone })

  if (existingUserId) {
    // Best-effort name reuse from any prior riders row for this person
    // (e.g. already a rider at another company) — same reasoning as
    // createInvite.ts's employees lookup. first_name/last_name are NOT NULL
    // with nothing else to fill them from here, so default to empty string.
    const { data: priorRow } = await admin
      .from('riders')
      .select('first_name, last_name')
      .eq('auth_user_id', existingUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error: riderErr } = await admin.from('riders').insert({
      auth_user_id: existingUserId,
      rider_company_id: riderCompanyId,
      role,
      first_name: priorRow?.first_name ?? '',
      last_name: priorRow?.last_name ?? '',
      phone: encryptField(phone),
    })
    if (riderErr) return { success: false, error: riderErr.message }

    return { success: true, data: { linked: true } }
  }

  const { token, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('rider_invites').insert({
    rider_company_id: riderCompanyId,
    phone,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by_rider_id: createdByRiderId,
  })
  if (error) return { success: false, error: error.message }

  return { success: true, data: { linked: false, token } }
}
