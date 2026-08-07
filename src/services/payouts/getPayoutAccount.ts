'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

export interface PayoutAccount {
  businessName: string
  settlementBankCode: string
  settlementBankName: string
  accountNumber: string
  accountName: string | null
  paystackSubaccountCode: string
  isVerified: boolean
  status: 'pending' | 'active' | 'disabled'
}

/** Mirrors getSettings.ts's shape — null when no payout account has been set up yet. */
export async function getPayoutAccount(): Promise<PayoutAccount | null> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return null

  const { data } = await supabase
    .from('laundry_payout_accounts')
    .select('business_name, settlement_bank_code, settlement_bank_name, account_number, account_name, paystack_subaccount_code, is_verified, status')
    .eq('laundry_id', profile.laundryId)
    .maybeSingle()

  if (!data) return null
  return {
    businessName: data.business_name,
    settlementBankCode: data.settlement_bank_code,
    settlementBankName: data.settlement_bank_name,
    accountNumber: data.account_number,
    accountName: data.account_name,
    paystackSubaccountCode: data.paystack_subaccount_code,
    isVerified: data.is_verified,
    status: data.status,
  }
}
