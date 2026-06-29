/**
 * Generates a stable, human-readable payment reference for MoMo instructions.
 * Stable within the same laundry + day + payment type — so refreshing the
 * instructions page doesn't show a new code.
 *
 * Format: RNSN-{YYYYMMDD}-{6 hex chars from laundryId}-{type suffix}
 * Example: RNSN-20260629-3A4B5C-RNW
 */
export function generatePaymentReference(
  laundryId: string,
  paymentType: 'cycle_renewal' | 'upgrade_prorate' | 'trial_conversion'
): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const laundryPrefix = laundryId.replace(/-/g, '').slice(0, 6).toUpperCase()
  const typeSuffix = paymentType === 'cycle_renewal' ? 'RNW'
    : paymentType === 'upgrade_prorate' ? 'UPG'
    : 'CVT'
  return `RNSN-${date}-${laundryPrefix}-${typeSuffix}`
}
