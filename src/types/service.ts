/**
 * types/service.ts
 *
 * TypeScript types for the services table (laundry services catalogue).
 * Spec reference: Rinsion_Database_Diagram.md → services
 */

export interface Service {
  id: string
  laundryId: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateServiceInput {
  laundryId: string
  name: string
}

export interface UpdateServiceInput {
  name?: string
  isActive?: boolean
}
