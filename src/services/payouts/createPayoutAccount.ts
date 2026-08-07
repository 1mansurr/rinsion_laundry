'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { createSubaccount } from '@/lib/payments/paystackClient'
import type { ServiceResult } from '@/types/serviceResult'

interface CreatePayoutAccountInput {
  businessName: string
  settlementBankCode: string
  settlementBankName: string
  accountNumber: string
  accountName?: string
}

/**
 * Creates the laundry's Paystack subaccount (percentage_charge: 0 — the
 * laundry receives everything, Rinsion touches nothing) and stores it. Each
 * call creates a brand-new Paystack subaccount, so re-running this against
 * an already-'active' payout account would orphan the old subaccount rather
 * than update it — blocked below; changing payout details on an active
 * account goes through Rinsion directly, same pattern as Growth-plan changes
 * elsewhere in this codebase.
 */
export async function createPayoutAccount(
  input: CreatePayoutAccountInput
): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = check.data

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('laundry_payout_accounts')
    .select('id, status')
    .eq('laundry_id', emp.laundryId)
    .maybeSingle()

  if (existing?.status === 'active') {
    return { success: false, error: 'A payout account is already active. Contact Rinsion to change your payout details.' }
  }

  const subaccountRes = await createSubaccount({
    businessName: input.businessName,
    settlementBank: input.settlementBankCode,
    accountNumber: input.accountNumber,
  })

  if (!subaccountRes.status) {
    return { success: false, error: subaccountRes.message || 'Failed to create payout account with Paystack.' }
  }

  const row = {
    laundry_id: emp.laundryId,
    business_name: input.businessName,
    settlement_bank_code: input.settlementBankCode,
    settlement_bank_name: input.settlementBankName,
    account_number: input.accountNumber,
    account_name: input.accountName ?? subaccountRes.data.account_name ?? null,
    paystack_subaccount_code: subaccountRes.data.subaccount_code,
    is_verified: subaccountRes.data.is_verified,
    status: 'active' as const,
    created_by_employee_id: emp.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabase.from('laundry_payout_accounts').update(row).eq('id', existing.id)
    : await supabase.from('laundry_payout_accounts').insert(row)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundryId,
    employee_id: emp.id,
    action_type: ACTIVITY_ACTION_TYPES.PAYOUT_ACCOUNT_CREATED,
    description: `Payout account created: ${input.businessName}, ${input.settlementBankName} ••••${input.accountNumber.slice(-4)}`,
  })

  revalidatePath('/settings/payouts')
  return { success: true, data: null }
}
