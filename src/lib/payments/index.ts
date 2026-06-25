/**
 * lib/payments/index.ts
 *
 * Exports the active payment provider. At launch, this is ManualMomoProvider.
 * In Month 2-3, swap for PaystackProvider — no service-layer or UI code changes needed.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Switching Providers)
 */

import { ManualMomoProvider } from './manual'
import type { PaymentProvider } from './types'

export const paymentProvider: PaymentProvider = new ManualMomoProvider()

export type { PaymentProvider, PaymentLink, PaymentEvent } from './types'
