import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getPayments, getPaymentsSummary } from '@/services/payments/getPayments'

export async function GET(request: Request) {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const method = searchParams.get('method') ?? undefined
  const page = Number(searchParams.get('page') ?? '1')

  const [{ rows, total }, summary] = await Promise.all([
    getPayments(profile.laundryId, { q, method, page, perPage: 30 }),
    getPaymentsSummary(profile.laundryId),
  ])

  return NextResponse.json({ rows, total, summary, role: profile.role })
}
