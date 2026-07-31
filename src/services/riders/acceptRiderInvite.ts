'use server'

import { createAdminClient } from '@/lib/supabase'
import { encryptField } from '@/lib/crypto'
import { signIn } from '@/services/auth/signIn'
import { hashInviteToken } from '@/utils/inviteToken'
import type { ServiceResult } from '@/types/serviceResult'

export interface AcceptRiderInviteInput {
  token: string
  firstName: string
  lastName: string
  password: string
}

/**
 * Public / unauthenticated — possession of the token is the authorization.
 * Mirrors services/employees/acceptInvite.ts exactly, against rider_invites/riders instead.
 */
export async function acceptRiderInvite(input: AcceptRiderInviteInput): Promise<ServiceResult<{ signedIn: boolean }>> {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName || !lastName) return { success: false, error: 'First and last name are required.' }
  if (input.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' }

  const admin = createAdminClient()
  const tokenHash = hashInviteToken(input.token)

  const { data: invite } = await admin
    .from('rider_invites')
    .select('id, rider_company_id, phone, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!invite) return { success: false, error: 'Invalid or expired invite.' }
  if (invite.accepted_at) return { success: false, error: 'This invite has already been used.' }
  if (new Date(invite.expires_at) < new Date()) return { success: false, error: 'This invite has expired.' }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    phone: invite.phone,
    password: input.password,
    phone_confirm: true,
  })
  if (authErr) return { success: false, error: authErr.message }

  const { error: riderErr } = await admin.from('riders').insert({
    auth_user_id: authData.user.id,
    rider_company_id: invite.rider_company_id,
    role: invite.role,
    first_name: firstName,
    last_name: lastName,
    phone: encryptField(invite.phone),
  })
  if (riderErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: riderErr.message }
  }

  await admin
    .from('rider_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Auto-sign-in so the invitee lands straight in their dashboard — same
  // signedIn-checked pattern as acceptInvite.ts (the caller must redirect to
  // /rider/login instead of /rider on signedIn === false).
  const signInResult = await signIn({ phone: invite.phone, password: input.password })

  return { success: true, data: { signedIn: signInResult.success } }
}
