/**
 * constants/plans.ts
 *
 * Subscription plan configuration and business-rule constants.
 *
 * Spec reference: Rinsion_Business_Overview.md → Pricing Model
 */

export const PLANS = {
  trial: {
    price: 0,
    dailyRate: 0,
    employeeLimit: 9,   // trial gets Growth-tier access
    branchLimit: 3,
    smsQuota: 800,
    durationDays: 14,
  },
  starter: {
    price: 90,          // GHS 90/month
    dailyRate: 3,       // 90 / 30
    employeeLimit: 4,
    branchLimit: 1,
    smsQuota: 300,
  },
  growth: {
    price: 180,         // GHS 180/month
    dailyRate: 6,       // 180 / 30
    employeeLimit: 9,
    branchLimit: 3,
    smsQuota: 800,
  },
} as const

export type PlanKey = keyof typeof PLANS

/** Days of full access before warnings start (soft block day 1) */
export const GRACE_PERIOD_SOFT_DAYS = 6   // days 1-6 past cycle end → soft_block
export const GRACE_PERIOD_HARD_DAYS = 6   // days 7-12 past cycle end → hard_block
// Day 13+ → locked

export const CYCLE_DAYS = 30
export const TRIAL_DAYS = 14

/** GHS charged per SMS beyond the plan quota */
export const SMS_OVERAGE_PRICE = 0.05

/** Usage fraction that triggers the 70% warning (0.70) */
export const SMS_WARNING_THRESHOLD = 0.70

/**
 * If a laundry has this many failures in the prior 24h, subsequent failed sends
 * count toward their quota. Below this threshold, failures are absorbed by Rinsion.
 * Spec reference: Rinsion_Technical_Overview.md §11 (Failure Counting)
 */
export const SMS_FAILURE_24H_THRESHOLD = 5
