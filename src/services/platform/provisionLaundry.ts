'use server'

import { createAdminClient, type DbClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { createInvite } from '@/services/employees/createInvite'
import { generateJoinPin } from '@/utils/generateJoinPin'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { TRIAL_DAYS, PLANS } from '@/constants/plans'
import type { TemplateKey, TemplateService, TemplatePriceCell } from '@/services/platform/templates'
import type { PricingModel } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface ProvisionLaundryInput {
  name: string
  ownerPhone: string
  /** Which template the form started from — 'custom' when built entirely from an uploaded price list. For logging only; the fields below are what's actually seeded. */
  templateKey: TemplateKey | 'custom'
  itemTypes: string[]
  services: TemplateService[]
  /** Admin-edited (or uploaded) item/service prices — real prices for this laundry */
  prices: TemplatePriceCell[]
  /** Inferred from services: uniform per_item/per_kg, or 'mixed' when services vary */
  pricingModel: PricingModel
}

export interface ProvisionLaundryResult {
  laundryId: string
  laundryCode: string
}

export async function provisionLaundry(input: ProvisionLaundryInput): Promise<ServiceResult<ProvisionLaundryResult>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  if (!input.name.trim()) return { success: false, error: 'Laundry name is required.' }
  if (input.services.length === 0) return { success: false, error: 'At least one service is required.' }

  const admin = createAdminClient()

  const servicesPayload = input.services.map(s => ({
    name: s.name,
    pricing_mode: s.pricingMode,
    min_kg_rate: s.kgRate?.min ?? null,
    max_kg_rate: s.kgRate?.max ?? null,
    notes: s.notes ?? null,
  }))

  const pricesPayload = input.prices.map(p => ({
    item_type_name: p.itemType,
    service_name: p.service,
    min_price: p.min,
    max_price: p.max,
    notes: p.notes ?? null,
  }))

  let data: { laundry_id: string; branch_id: string } | null = null
  let lastError: { code?: string; message: string } | null = null
  let laundryCode = ''

  for (let attempt = 0; attempt < 5; attempt++) {
    laundryCode = await generateLaundryCode(admin, attempt)
    const result = await admin
      .rpc('provision_laundry_tx', {
        p_laundry_code: laundryCode,
        p_laundry_name: input.name.trim(),
        p_branch_code: `${laundryCode}-01`,
        p_branch_name: 'Main Branch',
        p_join_pin: generateJoinPin(),
        p_trial_days: TRIAL_DAYS,
        p_sms_quota: PLANS.trial.smsQuota,
        p_item_types: input.itemTypes,
        p_services: servicesPayload,
        p_prices: pricesPayload,
        p_platform_admin_id: platformAdminId,
        p_pricing_model: input.pricingModel,
        p_employee_limit: PLANS.trial.employeeLimit,
      })
      .single()

    if (!result.error) {
      data = result.data as { laundry_id: string; branch_id: string }
      lastError = null
      break
    }
    lastError = result.error
    if (result.error.code !== '23505') break
  }

  if (!data) return { success: false, error: lastError?.message ?? 'Failed to provision laundry.' }

  const laundryId = data.laundry_id

  const inviteResult = await createInvite(laundryId, input.ownerPhone, 'admin', platformAdminId)
  if (!inviteResult.success) return { success: false, error: inviteResult.error }

  // Deferred handover SMS — fires after the provisioning transaction has committed.
  if (!inviteResult.data.linked) {
    const token = inviteResult.data.token
    const laundryName = input.name.trim()
    const baseUrl = getBaseUrl()
    import('@/services/notifications/sendSms')
      .then(m => m.sendSystemSms({
        laundryId,
        phone: input.ownerPhone,
        message: `${laundryName} is ready on Rinsion. Set your password: ${baseUrl}/i/${token}`,
        triggerEvent: 'EMPLOYEE_INVITE',
      }))
      .catch(() => null)
  }

  return { success: true, data: { laundryId, laundryCode } }
}

async function generateLaundryCode(admin: DbClient, attempt: number): Promise<string> {
  const { count } = await admin.from('laundries').select('id', { count: 'exact', head: true })
  const next = (count ?? 0) + 1 + attempt
  return `RNSN-${String(next).padStart(3, '0')}`
}
