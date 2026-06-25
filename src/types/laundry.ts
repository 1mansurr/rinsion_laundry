/**
 * types/laundry.ts
 *
 * TypeScript types for the laundries and branches tables.
 * Spec reference: Rinsion_Database_Diagram.md → laundries, branches
 */

export interface Laundry {
  id: string
  laundryCode: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  laundryId: string
  branchCode: string
  name: string
  createdAt: string
  updatedAt: string
}
