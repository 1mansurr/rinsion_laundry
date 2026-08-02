import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/items/createItemType.ts via the admin client. */
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
  const { data, error } = await admin
    .from('item_types')
    .insert({ laundry_id: profile.laundryId, name })
    .select('id, name, is_active')
    .single()
  if (error) return NextResponse.json({ error: 'Failed to create item type.' }, { status: 500 })

  revalidateTag(`reference-data-${profile.laundryId}`)
  return NextResponse.json({ itemType: { id: data.id, name: data.name, isActive: data.is_active } })
}
