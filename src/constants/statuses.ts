/**
 * constants/statuses.ts
 *
 * Order and payment status constants.
 *
 * Note: 'draft' exists in the database enum but is NOT included here.
 * Draft is reserved for future Product B customer submissions. Product A
 * orders always start at 'received'.
 *
 * Spec reference: Rinsion_Business_Overview.md → Order Lifecycle
 */

export const ORDER_STATUSES = [
  'received',
  'confirmed',
  'processing',
  'ready',
  'collected',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Valid forward transitions (Cancelled is always available as an alternative) */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received:   ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready:      ['collected', 'cancelled'],
  collected:  [],
  cancelled:  [],
}

export const ORDER_PRIORITIES = ['normal', 'express', 'urgent'] as const
export type OrderPriority = (typeof ORDER_PRIORITIES)[number]

export const PAYMENT_METHODS = [
  'cash',
  'mobile_money',
  'card',
  'bank_transfer',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const EMPLOYEE_ROLES = ['admin', 'employee'] as const
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number]

/** Named accessors for EMPLOYEE_ROLES — use instead of bare 'admin'/'employee' string literals. */
export const ROLES: Record<'ADMIN' | 'EMPLOYEE', EmployeeRole> = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
}

export const PRICING_MODES = ['per_item', 'per_kg'] as const
export type PricingMode = (typeof PRICING_MODES)[number]

/** Laundry-level choice: 'mixed' lets each service independently be per_item or per_kg */
export const PRICING_MODELS = ['per_item', 'per_kg', 'mixed'] as const
export type PricingModel = (typeof PRICING_MODELS)[number]

export const JOIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number]

export const JOIN_REQUEST_STATUS: Record<'PENDING' | 'APPROVED' | 'REJECTED', JoinRequestStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const SMS_STATUSES = ['queued', 'sent', 'failed'] as const
export type SmsStatus = (typeof SMS_STATUSES)[number]

export const SMS_STATUS: Record<'QUEUED' | 'SENT' | 'FAILED', SmsStatus> = {
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
}
