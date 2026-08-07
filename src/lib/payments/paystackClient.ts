/**
 * lib/payments/paystackClient.ts
 *
 * Low-level Paystack REST client. Shared by PaystackProvider (paystack.ts —
 * charge/initialize-transaction/webhook-verify) and the M2/M3 payout + order
 * services (subaccounts, bank lookups). Not part of the PaymentProvider
 * interface: subaccounts and bank listing aren't single-recipient concepts,
 * so they don't fit createPaymentLink/chargeMobileMoney/verifyWebhook.
 *
 * All Paystack fetch() calls are isolated here — nothing leaks out.
 *
 * Requires env var (server-only): PAYSTACK_SECRET_KEY
 */

import { logger } from '@/lib/logger'
import type { MobileMoneyProvider } from './types'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

export interface PaystackResponse<T> {
  status: boolean
  message: string
  data: T
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<PaystackResponse<T>> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const json = await res.json() as PaystackResponse<T>
  if (!res.ok || !json.status) {
    logger.error('paystackClient: request failed', { path, httpStatus: res.status, message: json.message })
  }
  return json
}

// ---------------------------------------------------------------------------
// Charge API — POST /charge (mobile money direct debit, pushes a USSD/PIN
// prompt to the customer's device)
// ---------------------------------------------------------------------------

export interface ChargeParams {
  email: string
  amount: number // pesewas
  reference: string
  phone: string
  provider: MobileMoneyProvider
  metadata: Record<string, unknown>
  /** Laundry's Paystack subaccount code — order payments only (M3). Absent for subscription payments (M1), which settle to Rinsion's main account. */
  subaccount?: string
}

export interface ChargeResponseData {
  status: string // e.g. 'pay_offline' (awaiting PIN), 'success', 'failed'
  reference: string
  display_text?: string
  amount: number
}

export async function charge(params: ChargeParams): Promise<PaystackResponse<ChargeResponseData>> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    currency: 'GHS',
    reference: params.reference,
    metadata: params.metadata,
    mobile_money: { phone: params.phone, provider: params.provider },
  }
  if (params.subaccount) {
    body.subaccount = params.subaccount
    body.bearer = 'subaccount'
  }
  return paystackFetch<ChargeResponseData>('/charge', { method: 'POST', body: JSON.stringify(body) })
}

// ---------------------------------------------------------------------------
// Initialize Transaction — POST /transaction/initialize (hosted redirect,
// card/bank fallback)
// ---------------------------------------------------------------------------

export interface InitializeTransactionParams {
  email: string
  amount: number // pesewas
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
  channels?: string[]
  subaccount?: string
}

export interface InitializeTransactionData {
  authorization_url: string
  access_code: string
  reference: string
}

export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<PaystackResponse<InitializeTransactionData>> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    currency: 'GHS',
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
    channels: params.channels ?? ['card', 'bank', 'bank_transfer'],
  }
  if (params.subaccount) {
    body.subaccount = params.subaccount
    body.bearer = 'subaccount'
  }
  return paystackFetch<InitializeTransactionData>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Subaccounts — POST /subaccount (M2: laundry payout accounts)
// ---------------------------------------------------------------------------

export interface CreateSubaccountParams {
  businessName: string
  /** Bank/MoMo code from listBanks() — a real bank code or a MoMo network's pseudo-bank code. */
  settlementBank: string
  accountNumber: string
}

export interface SubaccountData {
  subaccount_code: string
  account_number: string
  settlement_bank: string
  is_verified: boolean
  account_name?: string
}

export async function createSubaccount(
  params: CreateSubaccountParams
): Promise<PaystackResponse<SubaccountData>> {
  return paystackFetch<SubaccountData>('/subaccount', {
    method: 'POST',
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.settlementBank,
      account_number: params.accountNumber,
      // Rinsion takes no cut on order payments — the laundry's subaccount
      // receives everything and bears Paystack's own processing fee.
      percentage_charge: 0,
    }),
  })
}

// ---------------------------------------------------------------------------
// Bank lookups — GET /bank (M2)
// ---------------------------------------------------------------------------

export interface BankOption {
  name: string
  code: string
  type: string // 'ghipps' (real banks) | 'mobile_money' (MoMo networks, as pseudo-banks)
}

/** Both real banks and MoMo networks (as pseudo-banks) for Ghana — Paystack returns both types unfiltered when no `type` param is given. */
export async function listBanks(): Promise<PaystackResponse<BankOption[]>> {
  return paystackFetch<BankOption[]>('/bank?country=ghana&currency=GHS')
}

export interface ResolvedAccount {
  account_number: string
  account_name: string
  bank_id: number
}

/**
 * GET /bank/resolve — historically NGN-bank-centric; whether this resolves
 * Ghanaian MoMo wallet names is an open item (see the plan's pre-launch
 * verification checklist). Callers should treat a failed/empty resolution as
 * "fall back to Paystack's own is_verified flag plus a manual admin glance",
 * not as a hard error.
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResponse<ResolvedAccount>> {
  return paystackFetch<ResolvedAccount>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  )
}
