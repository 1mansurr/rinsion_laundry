import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/services/createService.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const admin = createAdminClient()

  // New services in a fully weight-based laundry default to per_kg too;
  // 'mixed' and 'per_item' laundries default new services to per_item —
  // same as createService.ts.
  const { data: settings } = await admin.from('settings').select('pricing_model').eq('laundry_id', profile.laundryId).single()
  const pricingMode = settings?.pricing_model === 'per_kg' ? 'per_kg' : 'per_item'

  const { data, error } = await admin
    .from('services')
    .insert({ laundry_id: profile.laundryId, name, pricing_mode: pricingMode })
    .select('id, name, is_active, pricing_mode, min_kg_rate, max_kg_rate, notes')
    .single()
  if (error) return NextResponse.json({ error: 'Failed to create service.' }, { status: 500 })

  revalidateTag(`reference-data-${profile.laundryId}`)
  return NextResponse.json({
    service: {
      id: data.id,
      name: data.name,
      isActive: data.is_active,
      pricingMode: data.pricing_mode,
      minKgRate: data.min_kg_rate === null ? null : Number(data.min_kg_rate),
      maxKgRate: data.max_kg_rate === null ? null : Number(data.max_kg_rate),
      notes: data.notes,
    },
  })
}
