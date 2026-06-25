/**
 * types/serviceResult.ts
 *
 * The standard return shape for every service function in the codebase.
 * Never throw raw errors to the UI — always wrap in this type.
 *
 * Spec reference: Rinsion_Project_Folder_Structure.md → API Response Standards
 */

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
