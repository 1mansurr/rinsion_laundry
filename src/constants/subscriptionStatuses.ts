/**
 * constants/subscriptionStatuses.ts
 *
 * Subscription lifecycle status constants and SMS trigger event names.
 *
 * Spec reference:
 * - Rinsion_Business_Overview.md → Subscription Cycles & Renewal
 * - Rinsion_Technical_Overview.md §10 (Subscription Lifecycle)
 */

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'soft_block',
  'hard_block',
  'locked',
  'cancelled',
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** Statuses under which new orders, payments, and edits are blocked */
export const WRITE_BLOCKED_STATUSES: SubscriptionStatus[] = [
  'hard_block',
  'locked',
]

export const SUBSCRIPTION_PLANS = ['trial', 'starter', 'growth'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]

export const SUBSCRIPTION_PAYMENT_TYPES = [
  'cycle_renewal',
  'upgrade_prorate',
  'trial_conversion',
] as const
export type SubscriptionPaymentType = (typeof SUBSCRIPTION_PAYMENT_TYPES)[number]

export const SUBSCRIPTION_PAYMENT_METHODS = ['manual_momo', 'paystack'] as const
export type SubscriptionPaymentMethod = (typeof SUBSCRIPTION_PAYMENT_METHODS)[number]

export const SMS_TRIGGER_EVENTS = [
  'ORDER_CREATED',
  'ORDER_READY',
  'PICKUP_CODE_RESEND',
  'RENEWAL_REMINDER_3_DAYS',
  'RENEWAL_REMINDER_1_DAY',
  'RENEWAL_REMINDER_DAY_OF',
  'QUOTA_WARNING_70',
] as const

export type SmsTriggerEvent = (typeof SMS_TRIGGER_EVENTS)[number]

/** Activity log action type strings — must match ERD section exactly */
export const ACTIVITY_ACTION_TYPES = {
  ORDER_CREATED:                    'ORDER_CREATED',
  ORDER_EDITED:                     'ORDER_EDITED',
  PAYMENT_RECORDED:                 'PAYMENT_RECORDED',
  REFUND_RECORDED:                  'REFUND_RECORDED',
  STATUS_UPDATED:                   'STATUS_UPDATED',
  CUSTOMER_UPDATED:                 'CUSTOMER_UPDATED',
  EMPLOYEE_ADDED:                   'EMPLOYEE_ADDED',
  EMPLOYEE_DISABLED:                'EMPLOYEE_DISABLED',
  SMS_SENT:                         'SMS_SENT',
  SMS_FAILED:                       'SMS_FAILED',
  SMS_QUOTA_EXCEEDED:               'SMS_QUOTA_EXCEEDED',
  SUBSCRIPTION_PAYMENT_RECORDED:    'SUBSCRIPTION_PAYMENT_RECORDED',
  SUBSCRIPTION_UPGRADED:            'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED:          'SUBSCRIPTION_DOWNGRADED',
  SUBSCRIPTION_GRACE_PERIOD_ENTERED:'SUBSCRIPTION_GRACE_PERIOD_ENTERED',
  SUBSCRIPTION_HARD_BLOCK_ENTERED:  'SUBSCRIPTION_HARD_BLOCK_ENTERED',
  SUBSCRIPTION_LOCKED:              'SUBSCRIPTION_LOCKED',
  SETTINGS_UPDATED:                 'SETTINGS_UPDATED',
  INTERNAL_LAUNDRY_CREATED:         'INTERNAL_LAUNDRY_CREATED',
  INTERNAL_TRIAL_STARTED:           'INTERNAL_TRIAL_STARTED',
  INTERNAL_PAYMENT_RESOLVED:        'INTERNAL_PAYMENT_RESOLVED',
} as const

export type ActivityActionType = (typeof ACTIVITY_ACTION_TYPES)[keyof typeof ACTIVITY_ACTION_TYPES]
