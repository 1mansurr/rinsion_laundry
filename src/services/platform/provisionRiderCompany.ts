'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { createRiderInvite } from '@/services/riders/createRiderInvite'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { RIDER_ROLE } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface ProvisionRiderCompanyInput {
  name: string
  companyPhone: string
  adminPhone: string
}

export interface ProvisionRiderCompanyResult {
  riderCompanyId: string
  /** Present only when a new invite was created (not when an existing auth account got linked directly) — the platform admin copies/forwards this themselves. No SMS is sent for rider invites; see createRiderInvite.ts. */
  inviteLink: string | null
}

/**
 * Manual, platform-admin-only provisioning — mirrors provisionLaundry.ts.
 * One rider company at launch by design (docs/customer-portal+rider.md's
 * "Architecture Recommendation" update); this exists so a second company
 * later is the same flow again, not a new one.
 */
export async function provisionRiderCompany(input: ProvisionRiderCompanyInput): Promise<ServiceResult<ProvisionRiderCompanyResult>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const name = input.name.trim()
  if (!name) return { success: false, error: 'Rider company name is required.' }

  const admin = createAdminClient()

  const { data: company, error } = await admin
    .from('rider_companies')
    .insert({ name, phone: input.companyPhone.trim() })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }

  const riderCompanyId = company.id as string

  const inviteResult = await createRiderInvite(riderCompanyId, input.adminPhone, RIDER_ROLE.ADMIN, null)
  if (!inviteResult.success) return { success: false, error: inviteResult.error }

  // No SMS is ever sent for a rider invite (that would draw on a laundry's
  // SMS quota for something that isn't laundry business) — the platform
  // admin gets the raw link back here and forwards it themselves, same as
  // a rider-company admin does for rider invites from their own dashboard.
  const inviteLink = inviteResult.data.linked ? null : `${getBaseUrl()}/ri/${inviteResult.data.token}`

  return { success: true, data: { riderCompanyId, inviteLink } }
}
