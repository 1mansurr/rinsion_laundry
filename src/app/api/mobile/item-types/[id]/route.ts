import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

/** Mirrors services/items/toggleItemType.ts and deleteItemType.ts, combined via an `action` field, via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const body = await request.json().catch(() => null) as { action?: 'toggle' | 'delete'; isActive?: boolean } | null
  const admin = createAdminClient()

  if (body?.action === 'delete') {
    const { error } = await admin
      .from('item_types')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to delete item type.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  if (body?.action === 'toggle' && typeof body.isActive === 'boolean') {
    const { error } = await admin
      .from('item_types')
      .update({ is_active: body.isActive })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to update item type.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'action must be "toggle" (with isActive) or "delete".' }, { status: 400 })
}
