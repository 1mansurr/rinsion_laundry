import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'
import type { PricingMode } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

interface Body {
  action?: 'toggle' | 'delete' | 'pricing'
  isActive?: boolean
  pricingMode?: PricingMode
  minKgRate?: number | null
  maxKgRate?: number | null
  notes?: string | null
}

/** Mirrors services/services/toggleService.ts, deleteService.ts, and setServicePricing.ts, combined via an `action` field, via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const body = await request.json().catch(() => null) as Body | null
  const admin = createAdminClient()

  if (body?.action === 'delete') {
    const { error } = await admin
      .from('services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to delete service.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  if (body?.action === 'toggle' && typeof body.isActive === 'boolean') {
    const { error } = await admin
      .from('services')
      .update({ is_active: body.isActive })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to update service.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  if (body?.action === 'pricing' && body.pricingMode) {
    const { pricingMode, minKgRate, maxKgRate, notes } = body
    if (pricingMode === 'per_kg' && minKgRate !== null && minKgRate !== undefined && maxKgRate !== null && maxKgRate !== undefined) {
      if (isNaN(minKgRate) || isNaN(maxKgRate) || minKgRate < 0 || maxKgRate < minKgRate) {
        return NextResponse.json({ error: 'Max rate must be greater than or equal to min rate.' }, { status: 400 })
      }
    }
    const { error } = await admin
      .from('services')
      .update({
        pricing_mode: pricingMode,
        min_kg_rate: pricingMode === 'per_kg' ? minKgRate ?? null : null,
        max_kg_rate: pricingMode === 'per_kg' ? maxKgRate ?? null : null,
        notes: pricingMode === 'per_kg' ? (notes?.trim() || null) : null,
      })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to update pricing.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
