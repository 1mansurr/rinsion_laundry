/**
 * lib/payments/types.ts
 *
 * Provider-agnostic payment interface. Service functions target this interface;
 * Paystack-specific code stays inside lib/payments/paystack.ts.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Payment Provider Abstraction)
 */

export interface PaymentProvider {
  /**
   * Creates a payment link or returns static instructions (for manual MoMo).
   * For ManualMomoProvider: returns the Rinsion MoMo number and a reference code.
   * For PaystackProvider: calls Paystack's Initialize Transaction API.
   */
  createPaymentLink(
    amount: number,
    reference: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentLink>

  /**
   * Verifies a webhook payload from the payment provider.
   * For ManualMomoProvider: not used (payments verified manually).
   * For PaystackProvider: verifies the signature and parses the event.
   */
  verifyWebhook(
    payload: unknown,
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

export interface PaymentEvent {
  reference: string
  amount: number
  status: 'success' | 'failed'
  metadata: Record<string, unknown>
}
