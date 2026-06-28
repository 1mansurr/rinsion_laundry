'use server'

import { createAdminClient, createClient } from '@/lib/supabase'
import { INTERNAL_ADMIN_EMAILS } from '@/constants/internalAdmins'
import { PLANS, TRIAL_DAYS } from '@/constants/plans'
import type { ServiceResult } from '@/types/serviceResult'

export interface CreateLaundryInput {
  laundryName: string
  laundryCode: string
  branchName: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPhone: string
}

export interface CreateLaundryData {
  laundryId: string
  branchId: string
  employeeId: string
  tempPassword: string
}

export async function createLaundry(
  input: CreateLaundryInput
): Promise<ServiceResult<CreateLaundryData>> {
  // Verify the calling user is a Rinsion internal admin
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || !INTERNAL_ADMIN_EMAILS.includes(user.email ?? '')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const admin = createAdminClient()

  // 1. Laundry
  const { data: laundry, error: laundryErr } = await admin
    .from('laundries')
    .insert({ name: input.laundryName, laundry_code: input.laundryCode })
    .select('id')
    .single()

  if (laundryErr) return { success: false, error: laundryErr.message }

  // 2. Branch
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

  // 3. Auth user
  const tempPassword = generateTempPassword()
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: input.ownerEmail,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) return { success: false, error: authErr.message }

  // 4. Employee record (owner = admin role)
  const { data: employee, error: employeeErr } = await admin
    .from('employees')
    .insert({
      auth_user_id: authData.user.id,
      laundry_id: laundry.id,
      branch_id: branch.id,
      role: 'admin',
      first_name: input.ownerFirstName,
      last_name: input.ownerLastName,
      email: input.ownerEmail,
      phone: input.ownerPhone,
    })
    .select('id')
    .single()

  if (employeeErr) return { success: false, error: employeeErr.message }

  // 5. Settings (all defaults)
  const { error: settingsErr } = await admin
    .from('settings')
    .insert({ laundry_id: laundry.id })

  if (settingsErr) return { success: false, error: settingsErr.message }

  // 6. Default item types and services — active out of the box, admin can deactivate any
  await admin.from('item_types').insert(
    DEFAULT_ITEM_TYPES.map(name => ({ laundry_id: laundry.id, name, is_active: true }))
  )
  await admin.from('services').insert(
    DEFAULT_SERVICES.map(name => ({ laundry_id: laundry.id, name, is_active: true }))
  )

  // 7. Trial subscription — 14-day trial starts immediately on provisioning
  const today = new Date().toISOString().split('T')[0]
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { error: subErr } = await admin
    .from('subscriptions')
    .insert({
      laundry_id: laundry.id,
      plan: 'trial',
      status: 'trialing',
      cycle_start_date: today,
      cycle_end_date: trialEnd,
      sms_quota: PLANS.trial.smsQuota,
    })

  if (subErr) return { success: false, error: subErr.message }

  return {
    success: true,
    data: {
      laundryId: laundry.id,
      branchId: branch.id,
      employeeId: employee.id,
      tempPassword,
    },
  }
}

const DEFAULT_ITEM_TYPES = [
  'Shirt',
  'Trouser',
  'T-Shirt',
  'Dress',
  'Skirt',
  'Suit (Jacket)',
  'Jeans',
  'Coat / Blazer',
  'Bedsheet',
  'Pillowcase',
  'Duvet / Comforter',
  'Towel',
  'Uniform',
  'Curtain',
]

const DEFAULT_SERVICES = [
  'Wash Only',
  'Wash & Iron',
  'Iron Only',
  'Dry Clean',
]

function generateTempPassword(): string {
  // Unambiguous chars (no 0/O, 1/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw
}
