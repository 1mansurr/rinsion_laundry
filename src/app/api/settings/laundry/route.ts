import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getLaundry } from '@/services/settings'

export async function GET() {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const laundry = await getLaundry()

  return NextResponse.json({ laundry })
}
