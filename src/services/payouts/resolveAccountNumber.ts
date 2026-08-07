'use server'

import { requireRole } from '@/lib/auth'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { ROLES } from '@/constants/statuses'
import { resolveAccountNumber as paystackResolve } from '@/lib/payments/paystackClient'
import type { ServiceResult } from '@/types/serviceResult'

interface ResolvedAccount {
  accountName: string
}

/**
 * "Verify" step before saving a payout account. GET /bank/resolve is
 * historically NGN-bank-centric — whether it resolves Ghanaian MoMo wallet
 * names is an open item (see the payments plan's pre-launch verification
 * checklist). A failed/empty resolution is surfaced as a normal error so the
 * UI can fall back to "save unverified, an admin will glance at it", not a
 * hard block.
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string
): Promise<ServiceResult<ResolvedAccount>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check

  const res = await paystackResolve(accountNumber, bankCode)
  if (!res.status) return { success: false, error: res.message || 'Could not resolve this account number.' }

  return { success: true, data: { accountName: res.data.account_name } }
}
