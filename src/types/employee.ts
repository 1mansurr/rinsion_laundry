/**
 * types/employee.ts
 *
 * TypeScript types for the employees table.
 * Spec reference: Rinsion_Database_Diagram.md → employees
 */

import type { EmployeeRole } from '@/constants/statuses'

export interface Employee {
  id: string
  authUserId: string | null
  laundryId: string
  branchId: string
  role: EmployeeRole
  firstName: string
  lastName: string
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeInput {
  laundryId: string
  branchId: string
  role: EmployeeRole
  firstName: string
  lastName: string
  email: string
  phone: string
}
