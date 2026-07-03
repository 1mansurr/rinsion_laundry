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

export const PRICING_MODES = ['per_item', 'per_kg'] as const
export type PricingMode = (typeof PRICING_MODES)[number]
