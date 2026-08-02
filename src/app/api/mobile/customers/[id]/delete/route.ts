import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'

interface Params {
  params: { id: string }
}

/** Mirrors services/customers/deleteCustomer.ts (soft delete) via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to delete customer.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
