/**
 * lib/payments/types.ts
 *
 * Provider-agnostic payment interface. Service functions target this interface;
 * Paystack-specific code stays inside lib/payments/paystack.ts.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Payment Provider Abstraction)
 */

/** Paystack mobile_money.provider slugs (Ghana). */
export type MobileMoneyProvider = 'mtn' | 'vod' | 'tgo'

export interface PaymentProvider {
  /**
   * Creates a hosted payment link (card/bank) or returns static instructions
   * (manual MoMo). For PaystackProvider: calls Initialize Transaction.
   * `metadata.callbackPath`, if set, is where Paystack redirects after
   * payment (e.g. '/settings/subscription?action=claimed') — resolved
   * against the current request's origin.
   */
  createPaymentLink(
    amount: number,
    reference: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentLink>

  /**
   * Pushes a USSD/PIN prompt directly to the customer's phone via Paystack's
   * Charge API. Not supported by ManualMomoProvider — manual MoMo has no
   * device-push equivalent.
   */
  chargeMobileMoney(
    amount: number,
    reference: string,
    phone: string,
    provider: MobileMoneyProvider,
    metadata: Record<string, unknown>
  ): Promise<ChargeResult>

  /**
   * Verifies a webhook payload from the payment provider. `rawBody` must be
   * the exact, unparsed request body — HMAC verification hashes raw bytes.
   * For ManualMomoProvider: not used (payments verified manually).
   */
  verifyWebhook(
    rawBody: string,
    signature: string
  ): Promise<PaymentEvent | null>
}

export interface PaymentLink {
  /** Paystack: the checkout URL. Manual MoMo: the Rinsion MoMo number. */
  url?: string
  momoNumber?: string
  referenceCode: string
  amount: number
}

export interface ChargeResult {
  /** Paystack charge status, e.g. 'pay_offline' (awaiting PIN), 'success', 'failed'. */
  status: string
  referenceCode: string
  /** Text to show the customer, e.g. "Enter your PIN to confirm". */
  displayText?: string
  amount: number
}

export interface PaymentEvent {
  reference: string
  amount: number
  status: 'success' | 'failed'
  /** Paystack's channel field, e.g. 'mobile_money' | 'card' | 'bank_transfer'. */
  channel: string | null
  metadata: Record<string, unknown>
}
