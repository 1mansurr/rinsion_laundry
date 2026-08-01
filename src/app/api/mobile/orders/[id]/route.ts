import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getOrderDetail } from '@/services/orders/getOrderDetail'

interface Params {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await getOrderDetail(params.id, profile.laundryId, createAdminClient())
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  return NextResponse.json({ order })
}
