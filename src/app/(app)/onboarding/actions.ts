'use server'

// Thin Server Action boundary — OnboardingClient (a Client Component) imports
// these directly, and Next only allows "use server" files to export async
// function declarations (not re-exports). The actual Supabase calls live in
// services/onboarding/.
import * as onboardingService from '@/services/onboarding'
import type { ServiceResult } from '@/types/serviceResult'

export async function updateLaundrySetup(
  laundryId: string,
  laundryName: string,
  branchId: string,
  branchName: string,
): Promise<ServiceResult<null>> {
  return onboardingService.updateLaundrySetup(laundryId, laundryName, branchId, branchName)
}

export async function completeOnboarding(): Promise<ServiceResult<null>> {
  return onboardingService.completeOnboarding()
}
