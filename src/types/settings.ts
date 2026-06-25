/**
 * types/settings.ts
 *
 * TypeScript types for the settings table.
 * Spec reference: Rinsion_Database_Diagram.md → Settings section
 */

export interface Settings {
  id: string
  laundryId: string
  allowPartialPayments: boolean
  allowExpressOrders: boolean
  allowCustomerSubmissions: boolean
  requirePickupCode: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateSettingsInput {
  allowPartialPayments?: boolean
  allowExpressOrders?: boolean
  allowCustomerSubmissions?: boolean
  requirePickupCode?: boolean
}
