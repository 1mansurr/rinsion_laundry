import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/pricing/upsertPrice.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const body = await request.json().catch(() => null) as {
    itemTypeId?: string
    serviceId?: string
    minPrice?: number
    maxPrice?: number
    notes?: string | null
  } | null
  const { itemTypeId, serviceId, minPrice, maxPrice, notes } = body ?? {}
  if (!itemTypeId || !serviceId || minPrice === undefined || maxPrice === undefined) {
    return NextResponse.json({ error: 'itemTypeId, serviceId, minPrice, and maxPrice are required.' }, { status: 400 })
  }
  if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
    return NextResponse.json({ error: 'Max price must be greater than or equal to min price.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('item_service_prices').upsert(
    {
      laundry_id: profile.laundryId,
      item_type_id: itemTypeId,
      service_id: serviceId,
      min_price: minPrice,
      max_price: maxPrice,
      notes: notes?.trim() || null,
      is_active: true,
    },
    { onConflict: 'laundry_id,item_type_id,service_id' }
  )
  if (error) return NextResponse.json({ error: 'Failed to save price.' }, { status: 500 })

  revalidateTag(`reference-data-${profile.laundryId}`)
  return NextResponse.json({ success: true })
}
