import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { getPricingMatrix } from '@/services/pricing/getPricingMatrix'

/**
 * Near-static reference data the create-order screen (and the Items &
 * Services screen, M11) needs up front — item types, services, the
 * item×service pricing matrix, and the laundry's overall pricing model. The
 * first three already use the admin client internally (no cookie
 * dependency), so they're reused unchanged here; pricingModel is a plain
 * inline query since getSettings.ts is cookie-session-only.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [itemTypes, services, pricingMatrix, settingsResult] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
    createAdminClient().from('settings').select('pricing_model').eq('laundry_id', profile.laundryId).single(),
  ])

  return NextResponse.json({
    itemTypes,
    services,
    pricingMatrix,
    pricingModel: settingsResult.data?.pricing_model ?? 'per_item',
  })
}
