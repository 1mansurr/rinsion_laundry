'use server'

import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { createRiderInvite } from '@/services/riders/createRiderInvite'
import { requireRiderRole } from '@/lib/auth'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { RIDER_ROLE } from '@/constants/statuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface InviteRiderInput {
  phone: string
}

export interface InviteRiderResult {
  linked: boolean
  /** Forward this to the rider yourself — no SMS is sent for rider invites. Null when an existing account was linked directly. */
  inviteLink: string | null
}

// Auth-gated wrapper around createRiderInvite — mirrors employees/inviteEmployee.ts.
// Riders are always invited as role 'rider' from this dashboard action; a
// company's first admin is invited separately via provisionRiderCompany.ts.
export async function inviteRider(input: InviteRiderInput): Promise<ServiceResult<InviteRiderResult>> {
  const profile = await getMyRiderProfile()
  const check = requireRiderRole(profile, RIDER_ROLE.ADMIN)
  if (!check.success) return check
  const caller = check.data

  const result = await createRiderInvite(caller.riderCompanyId, input.phone, RIDER_ROLE.RIDER, caller.id)
  if (!result.success) return result

  const inviteLink = result.data.linked ? null : `${getBaseUrl()}/ri/${result.data.token}`

  revalidatePath('/rider/roster')
  return { success: true, data: { linked: result.data.linked, inviteLink } }
}
