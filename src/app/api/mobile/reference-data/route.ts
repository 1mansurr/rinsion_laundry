import { NextResponse, type NextRequest } from 'next/server'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { getPricingMatrix } from '@/services/pricing/getPricingMatrix'

/**
 * Near-static reference data the create-order screen needs up front — item
 * types, services, and the item×service pricing matrix. All three already
 * use the admin client internally (no cookie dependency), so they're reused
 * unchanged here.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [itemTypes, services, pricingMatrix] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
  ])

  return NextResponse.json({ itemTypes, services, pricingMatrix })
}
