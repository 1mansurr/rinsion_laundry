/**
 * types/plan.ts
 *
 * TypeScript type describing a plan tier's properties.
 * Spec reference: Rinsion_Business_Overview.md → Pricing Model
 */

export interface PlanConfig {
  price: number
  dailyRate: number
  employeeLimit: number
  branchLimit: number
  smsQuota: number
  durationDays?: number  // only for trial
}
