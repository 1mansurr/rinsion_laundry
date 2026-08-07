/**
 * lib/payments/index.ts
 *
 * Exports the payment providers. `paymentProvider` is the swappable default
 * (ManualMomoProvider today — nothing currently reads it directly, since the
 * manual claim flow talks to pending_payments directly rather than through
 * this interface).
 *
 * `paystackProvider` is a direct Paystack singleton used by the automated
 * direct-charge flows (subscription Pay-via-MoMo, order Pay-via-MoMo) —
 * these run *alongside* the manual flows, not as a provider swap, so they
 * import Paystack explicitly rather than through the generic `paymentProvider`.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Switching Providers)
 */

import { ManualMomoProvider } from './manual'
import { PaystackProvider } from './paystack'
import type { PaymentProvider } from './types'

export const paymentProvider: PaymentProvider = new ManualMomoProvider()
export const paystackProvider: PaymentProvider = new PaystackProvider()

export type { PaymentProvider, PaymentLink, PaymentEvent, ChargeResult, MobileMoneyProvider } from './types'
