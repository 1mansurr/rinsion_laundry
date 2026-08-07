import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { listGhanaBanks } from '@/services/payouts/listGhanaBanks'
import { resolveAccountNumber as paystackResolve, createSubaccount } from '@/lib/payments/paystackClient'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

/** Mirrors services/payouts/getPayoutAccount.ts + listGhanaBanks.ts via the admin client. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: account }, banks] = await Promise.all([
    admin
      .from('laundry_payout_accounts')
      .select('business_name, settlement_bank_code, settlement_bank_name, account_number, account_name, paystack_subaccount_code, is_verified, status')
      .eq('laundry_id', profile.laundryId)
      .maybeSingle(),
    listGhanaBanks(),
  ])

  return NextResponse.json({
    account: account
      ? {
          businessName: account.business_name,
          settlementBankCode: account.settlement_bank_code,
          settlementBankName: account.settlement_bank_name,
          accountNumber: account.account_number,
          accountName: account.account_name,
          isVerified: account.is_verified,
          status: account.status,
        }
      : null,
    banks,
  })
}

interface Body {
  action?: 'verify' | 'save'
  businessName?: string
  settlementBankCode?: string
  settlementBankName?: string
  accountNumber?: string
  accountName?: string
}

/** Mirrors services/payouts/resolveAccountNumber.ts + createPayoutAccount.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as Body | null
  const admin = createAdminClient()

  if (body?.action === 'verify') {
    if (!body.accountNumber || !body.settlementBankCode) {
      return NextResponse.json({ error: 'accountNumber and settlementBankCode are required.' }, { status: 400 })
    }
    const res = await paystackResolve(body.accountNumber, body.settlementBankCode)
    if (!res.status) return NextResponse.json({ error: res.message || 'Could not resolve this account number.' }, { status: 400 })
    return NextResponse.json({ accountName: res.data.account_name })
  }

  if (body?.action === 'save') {
    const { businessName, settlementBankCode, settlementBankName, accountNumber, accountName } = body
    if (!businessName || !settlementBankCode || !settlementBankName || !accountNumber) {
      return NextResponse.json({ error: 'businessName, settlementBankCode, settlementBankName, and accountNumber are required.' }, { status: 400 })
    }

    const { data: existing } = await admin
      .from('laundry_payout_accounts')
      .select('id, status')
      .eq('laundry_id', profile.laundryId)
      .maybeSingle()

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'A payout account is already active. Contact Rinsion to change your payout details.' }, { status: 409 })
    }

    const subaccountRes = await createSubaccount({ businessName, settlementBank: settlementBankCode, accountNumber })
    if (!subaccountRes.status) {
      return NextResponse.json({ error: subaccountRes.message || 'Failed to create payout account with Paystack.' }, { status: 502 })
    }

    const row = {
      laundry_id: profile.laundryId,
      business_name: businessName,
      settlement_bank_code: settlementBankCode,
      settlement_bank_name: settlementBankName,
      account_number: accountNumber,
      account_name: accountName ?? subaccountRes.data.account_name ?? null,
      paystack_subaccount_code: subaccountRes.data.subaccount_code,
      is_verified: subaccountRes.data.is_verified,
      status: 'active' as const,
      created_by_employee_id: profile.employeeId,
      updated_at: new Date().toISOString(),
    }

    const { error } = existing
      ? await admin.from('laundry_payout_accounts').update(row).eq('id', existing.id)
      : await admin.from('laundry_payout_accounts').insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.from('activity_logs').insert({
      laundry_id: profile.laundryId,
      employee_id: profile.employeeId,
      action_type: ACTIVITY_ACTION_TYPES.PAYOUT_ACCOUNT_CREATED,
      description: `Payout account created: ${businessName}, ${settlementBankName} ••••${accountNumber.slice(-4)}`,
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'action must be "verify" or "save".' }, { status: 400 })
}
