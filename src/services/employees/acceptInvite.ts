'use server'

import { createAdminClient } from '@/lib/supabase'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { signIn } from '@/services/auth/signIn'
import { hashInviteToken } from '@/utils/inviteToken'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface AcceptInviteInput {
  token: string
  firstName: string
  lastName: string
  password: string
}

/**
 * Public / unauthenticated — possession of the token is the authorization.
 * Runs entirely on the service-role client since there is no session yet.
 */
export async function acceptInvite(input: AcceptInviteInput): Promise<ServiceResult<{ signedIn: boolean }>> {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName || !lastName) return { success: false, error: 'First and last name are required.' }
  if (input.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' }

  const admin = createAdminClient()
  const tokenHash = hashInviteToken(input.token)

  const { data: invite } = await admin
    .from('pending_invites')
    .select('id, laundry_id, phone, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!invite) return { success: false, error: 'Invalid or expired invite.' }
  if (invite.accepted_at) return { success: false, error: 'This invite has already been used.' }
  if (new Date(invite.expires_at) < new Date()) return { success: false, error: 'This invite has expired.' }

  const branchId = await getSoleBranchId(invite.laundry_id, admin)
  if (!branchId) return { success: false, error: 'No branch found for this laundry.' }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    phone: invite.phone,
    password: input.password,
    phone_confirm: true,
  })
  if (authErr) return { success: false, error: authErr.message }

  const { error: empErr } = await admin.from('employees').insert({
    auth_user_id: authData.user.id,
    laundry_id: invite.laundry_id,
    branch_id: branchId,
    role: invite.role,
    first_name: firstName,
    last_name: lastName,
    phone: invite.phone,
  })
  if (empErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: empErr.message }
  }

  await admin
    .from('pending_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  await admin.from('activity_logs').insert({
    laundry_id: invite.laundry_id,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_ACCEPTED,
    description: `${firstName} ${lastName} accepted their invite`,
  })

  // Auto-sign-in so the invitee lands straight in the dashboard — uses the
  // request-bound session client internally, so this sets the real cookie.
  // Result is checked (not just awaited-and-ignored): if this silently fails,
  // no new session cookie gets set, and whoever's browser this is stays on
  // its previous session (e.g. the inviting admin's, if opened in the same
  // browser) — landing on /dashboard would then misleadingly show *their*
  // dashboard instead of failing visibly. The caller must redirect to
  // /login instead of /dashboard when signedIn is false.
  const signInResult = await signIn({ phone: invite.phone, password: input.password })

  return { success: true, data: { signedIn: signInResult.success } }
}
