/**
 * types/payment.ts
 *
 * TypeScript types for the payments table (customer order payments).
 * Distinct from subscription_payments.
 *
 * amount_paid and balance_due are computed at read time — never stored.
 *
 * Spec reference: Rinsion_Database_Diagram.md → Payments section
 */

import type { PaymentMethod } from '@/constants/statuses'

export interface Payment {
  id: string
  orderId: string
  recordedByEmployeeId: string
  amount: number
  paymentMethod: PaymentMethod
  createdAt: string
}

export interface RecordPaymentInput {
  orderId: string
  recordedByEmployeeId: string
  laundryId: string
  amount: number
  paymentMethod: PaymentMethod
}

/** Computed at read time from payments rows — never stored on orders */
export interface OrderBalance {
  total: number
  amountPaid: number
  balanceDue: number
  isPaid: boolean
}
