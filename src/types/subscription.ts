/**
 * types/subscription.ts
 *
 * TypeScript types for subscriptions and subscription_payments tables.
 * Spec reference: Rinsion_Database_Diagram.md → Subscriptions section
 */

import type { SubscriptionPlan, SubscriptionStatus, SubscriptionPaymentType, SubscriptionPaymentMethod } from '@/constants/subscriptionStatuses'

export interface Subscription {
  id: string
  laundryId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  cycleStartDate: string
  cycleEndDate: string
  smsQuota: number
  /** NULL means the 70% warning has not been sent yet this cycle */
  smsWarning70SentAt: string | null
  createdAt: string
  updatedAt: string
}

/** Immutable financial ledger record — never soft-deleted */
export interface SubscriptionPayment {
  id: string
  subscriptionId: string
  laundryId: string
  amount: number
  /** Snapshotted at payment time — historical records survive plan changes */
  planAtPayment: SubscriptionPlan
  paymentType: SubscriptionPaymentType
  paymentMethod: SubscriptionPaymentMethod
  externalReference: string | null
  cycleStartDate: string
  cycleEndDate: string
  /** Rinsion internal admin who verified MoMo; null for Paystack auto-reconciled */
  recordedByEmployeeId: string | null
  paidAt: string
  createdAt: string
}

export interface StartTrialInput {
  laundryId: string
  startDate: string
}

export interface RecordPaymentInput {
  subscriptionId: string
  laundryId: string
  amount: number
  planAtPayment: SubscriptionPlan
  paymentType: SubscriptionPaymentType
  paymentMethod: SubscriptionPaymentMethod
  externalReference?: string
  cycleStartDate: string
  cycleEndDate: string
  recordedByEmployeeId?: string
  paidAt: string
}
