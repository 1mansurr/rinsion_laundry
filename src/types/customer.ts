/**
 * types/customer.ts
 *
 * TypeScript types for the customers table.
 * total_orders and lifetime_revenue are computed at read time — never stored.
 *
 * Spec reference: Rinsion_Database_Diagram.md → customers
 */

export interface Customer {
  id: string
  laundryId: string
  customerCode: string
  firstName: string
  lastName: string
  phone: string
  firstVisitDate: string | null
  lastVisitDate: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Customer with computed fields, returned by getCustomer() with full detail */
export interface CustomerWithStats extends Customer {
  totalOrders: number
  lifetimeRevenue: number
}

export interface CreateCustomerInput {
  laundryId: string
  firstName: string
  lastName: string
  phone: string
}

export interface UpdateCustomerInput {
  firstName?: string
  lastName?: string
  phone?: string
}
