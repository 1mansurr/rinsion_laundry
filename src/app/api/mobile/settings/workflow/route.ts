import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'
import type { PricingModel } from '@/constants/statuses'

interface SettingsPatch {
  allowExpressOrders?: boolean
  requirePickupCode?: boolean
  allowCustomerSubmissions?: boolean
  pricingModel?: PricingModel
  taxRate?: number
}

/**
 * Mirrors services/settings/getSettings.ts via the admin client. Backs both
 * the Workflow and Pricing Model screens — same as the website, which reads
 * both from one getSettings() call. allowPartialPayments is read but has no
 * toggle anywhere on the website either, so it's omitted from the response
 * shape here too (nothing to show for it).
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('settings')
    .select('allow_express_orders, require_pickup_code, allow_customer_submissions, pricing_model, tax_rate')
    .eq('laundry_id', profile.laundryId)
    .single()
  if (!data) return NextResponse.json({ error: 'Settings not found.' }, { status: 404 })

  return NextResponse.json({
    settings: {
      allowExpressOrders: data.allow_express_orders,
      requirePickupCode: data.require_pickup_code,
      allowCustomerSubmissions: data.allow_customer_submissions,
      pricingModel: data.pricing_model,
      taxRate: Number(data.tax_rate),
    },
  })
}

/** Mirrors services/settings/updateSettings.ts, including its per_item/per_kg cascade onto every service, via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patch = await request.json().catch(() => null) as SettingsPatch | null
  if (!patch) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const admin = createAdminClient()
  const dbPatch: Record<string, boolean | string | number> = { updated_at: new Date().toISOString() }
  if (patch.allowExpressOrders !== undefined) dbPatch.allow_express_orders = patch.allowExpressOrders
  if (patch.requirePickupCode !== undefined) dbPatch.require_pickup_code = patch.requirePickupCode
  if (patch.allowCustomerSubmissions !== undefined) dbPatch.allow_customer_submissions = patch.allowCustomerSubmissions
  if (patch.pricingModel !== undefined) dbPatch.pricing_model = patch.pricingModel
  if (patch.taxRate !== undefined) dbPatch.tax_rate = patch.taxRate

  const { error } = await admin.from('settings').update(dbPatch).eq('laundry_id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 })

  // A laundry-wide pricing model switch to a pure mode forces every service
  // to match — same reasoning as updateSettings.ts. 'mixed' is left alone.
  if (patch.pricingModel === 'per_kg') {
    await admin.from('services').update({ pricing_mode: 'per_kg' }).eq('laundry_id', profile.laundryId)
    revalidateTag(`reference-data-${profile.laundryId}`)
  } else if (patch.pricingModel === 'per_item') {
    await admin.from('services').update({ pricing_mode: 'per_item', min_kg_rate: null, max_kg_rate: null }).eq('laundry_id', profile.laundryId)
    revalidateTag(`reference-data-${profile.laundryId}`)
  }

  const changed = Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')
  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: 'SETTINGS_UPDATED',
    description: `Settings updated: ${changed}`,
  })

  return NextResponse.json({ success: true })
}
