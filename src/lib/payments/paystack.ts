/**
 * lib/payments/paystack.ts
 *
 * Paystack payment provider — Month 2-3 integration.
 *
 * Stub: all methods return "not implemented" errors. When Paystack integration
 * ships, implement createPaymentLink() using the Initialize Transaction API and
 * verifyWebhook() using Paystack's HMAC-SHA512 signature verification.
 *
 * Switching to Paystack only requires updating lib/payments/index.ts to export
 * PaystackProvider instead of ManualMomoProvider.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Post-Launch: PaystackProvider)
 */

import type { PaymentProvider, PaymentLink, PaymentEvent } from './types'

export class PaystackProvider implements PaymentProvider {
  async createPaymentLink(
    _amount: number,
    _reference: string,
    _metadata: Record<string, unknown>
  ): Promise<PaymentLink> {
    throw new Error('PaystackProvider not implemented — deferred to Month 2-3')
  }

  async verifyWebhook(
    _payload: unknown,
    _signature: string
  ): Promise<PaymentEvent | null> {
    throw new Error('PaystackProvider not implemented — deferred to Month 2-3')
  }
}
