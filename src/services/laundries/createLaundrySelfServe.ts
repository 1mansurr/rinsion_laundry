'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import { DEFAULT_ITEM_TYPES, DEFAULT_SERVICES } from '@/constants/defaultCatalog'
import { generateJoinPin } from '@/utils/generateJoinPin'
import type { ServiceResult } from '@/types/serviceResult'

export interface CreateLaundrySelfServeInput {
  laundryName: string
  laundryCode: string
  branchName: string
}

export interface CreateLaundrySelfServeData {
  laundryId: string
  branchId: string
  employeeId: string
}

/**
 * Self-serve laundry creation for the public signup flow — reuses the
 * already-authenticated caller as the admin employee (no new auth user, no
 * temp password), and deliberately does NOT start a subscription. The trial
 * starts later, from a confirmation step after onboarding.
 */
export async function createLaundrySelfServe(
  input: CreateLaundrySelfServeInput
): Promise<ServiceResult<CreateLaundrySelfServeData>> {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: existing } = await sessionClient
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (existing) return { success: false, error: 'You already belong to a laundry.' }

  const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
  const lastName = (user.user_metadata?.last_name as string | undefined) ?? ''
  const phone = (user.user_metadata?.phone as string | undefined) ?? ''

  // Bypasses RLS deliberately — bootstrapping a brand new tenant means no
  // laundry_id exists yet for the tenant-scoped policies to key off. The
  // caller's identity is verified above, before any privileged write happens.
  const admin = createAdminClient()

  const { data: laundry, error: laundryErr } = await admin
    .from('laundries')
    .insert({ name: input.laundryName, laundry_code: input.laundryCode, join_pin: generateJoinPin() })
    .select('id')
    .single()
  if (laundryErr) return { success: false, error: laundryErr.message }

  const { data: branch, error: branchErr } = await admin
    .from('branches')
    .insert({
      laundry_id: laundry.id,
      branch_code: `${input.laundryCode}-MAIN`,
      name: input.branchName.trim() || 'Main Branch',
    })
    .select('id')
    .single()
  if (branchErr) return { success: false, error: branchErr.message }

  const { data: employee, error: employeeErr } = await admin
    .from('employees')
    .insert({
      auth_user_id: user.id,
      laundry_id: laundry.id,
      branch_id: branch.id,
      role: 'admin',
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      phone,
    })
    .select('id')
    .single()
  if (employeeErr) return { success: false, error: employeeErr.message }

  const { error: settingsErr } = await admin
    .from('settings')
    .insert({ laundry_id: laundry.id })
  if (settingsErr) return { success: false, error: settingsErr.message }

  await admin.from('item_types').insert(
    DEFAULT_ITEM_TYPES.map(name => ({ laundry_id: laundry.id, name, is_active: true }))
  )
  await admin.from('services').insert(
    DEFAULT_SERVICES.map(name => ({ laundry_id: laundry.id, name, is_active: true }))
  )

  return {
    success: true,
    data: { laundryId: laundry.id, branchId: branch.id, employeeId: employee.id },
  }
}
