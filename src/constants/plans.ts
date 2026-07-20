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
    employeeLimit: 6,   // owner + up to 5 staff
    branchLimit: 1,
    smsQuota: 400,
    durationDays: 14,
  },
  starter: {
    price: 120,          // GHS 120/month
    dailyRate: 4,        // 120 / 30
    employeeLimit: 6,    // owner + up to 5 staff
    branchLimit: 1,
    smsQuota: 400,
  },
  // Retired — Rinsion is a single-plan product now (never sold to a real
  // laundry). Kept only because the DB enum (subscription_plan) and
  // subscription_payments.plan_at_payment can't drop the value, and
  // convertTrial/canDowngrade still reference it defensively.
  growth: {
    price: 180,
    dailyRate: 6,
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

/** Max cap-eligible SMS sends allowed beyond the plan quota in a cycle — sends are skipped past this */
export const SMS_OVERAGE_LIMIT = 30

/** Usage fraction that triggers the 70% warning (0.70) */
export const SMS_WARNING_THRESHOLD = 0.70

/**
 * If a laundry has this many failures in the prior 24h, subsequent failed sends
 * count toward their quota. Below this threshold, failures are absorbed by Rinsion.
 * Spec reference: Rinsion_Technical_Overview.md §11 (Failure Counting)
 */
export const SMS_FAILURE_24H_THRESHOLD = 5
