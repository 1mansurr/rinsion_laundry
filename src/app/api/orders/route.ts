import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOrdersList } from '@/services/orders/getOrdersList'

export async function GET(request: Request) {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const page = Number(searchParams.get('page')) || 1

  const { rows, total } = await getOrdersList(profile.laundryId, {
    q,
    status,
    page,
    perPage: 30,
  })

  return NextResponse.json({ rows, total, role: profile.role })
}
