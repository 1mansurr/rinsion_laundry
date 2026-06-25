/**
 * types/itemType.ts
 *
 * TypeScript types for the item_types table.
 * Spec reference: Rinsion_Database_Diagram.md → item_types
 */

export interface ItemType {
  id: string
  laundryId: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateItemTypeInput {
  laundryId: string
  name: string
}

export interface UpdateItemTypeInput {
  name?: string
  isActive?: boolean
}
