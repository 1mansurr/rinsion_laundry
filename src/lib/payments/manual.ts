/**
 * lib/payments/manual.ts
 *
 * Launch payment provider: manual Mobile Money (MoMo) collection.
 *
 * createPaymentLink() returns static MoMo instructions — the Rinsion MoMo number,
 * the exact amount, and a unique reference code. The laundry sends the payment
 * independently; the Rinsion team marks it as received in the internal dashboard.
 *
 * verifyWebhook() is a no-op — manual MoMo has no automated webhook.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Launch: ManualMomoProvider)
 */

import type { PaymentProvider, PaymentLink, PaymentEvent } from './types'

const RINSION_MOMO_NUMBER = process.env.RINSION_MOMO_NUMBER ?? 'TODO: set RINSION_MOMO_NUMBER env var'

export class ManualMomoProvider implements PaymentProvider {
  async createPaymentLink(
    amount: number,
    reference: string,
    _metadata: Record<string, unknown>
  ): Promise<PaymentLink> {
    return {
      momoNumber: RINSION_MOMO_NUMBER,
      referenceCode: reference,
      amount,
    }
  }

  async verifyWebhook(
    _payload: unknown,
    _signature: string
  ): Promise<PaymentEvent | null> {
    // Manual MoMo has no webhook — payments are verified by the Rinsion team
    return null
  }
}
