import { PLANS } from '@/constants/plans'

/**
 * Calculates the prorate amount for a Starter → Growth mid-cycle upgrade.
 * Spec: prorate = days_remaining × (growth.dailyRate - starter.dailyRate)
 */
export function computeProrateAmount(daysRemaining: number): number {
  const dailyDiff = PLANS.growth.dailyRate - PLANS.starter.dailyRate
  return Math.ceil(daysRemaining * dailyDiff)
}
