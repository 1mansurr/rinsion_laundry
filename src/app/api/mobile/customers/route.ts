import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField, encryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getCustomersList } from '@/services/customers/getCustomersList'

export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const { rows, total } = await getCustomersList(profile.laundryId, { q, perPage: 20 }, createAdminClient())
  return NextResponse.json({ rows, total })
}

/**
 * Mirrors services/customers/createCustomer.ts's phone-uniqueness-first
 * logic, via the admin client. Last name is optional here — matches the
 * website's inline quick-add inside order creation (CreateOrderForm.tsx),
 * not the stricter standalone /customers/new page which requires it.
 */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { firstName?: string; lastName?: string; phone?: string; location?: string } | null
  const firstName = body?.firstName?.trim()
  const lastName = body?.lastName?.trim() ?? ''
  const phone = body?.phone?.trim()
  const location = body?.location?.trim()
  if (!firstName || !phone) {
    return NextResponse.json({ error: 'First name and phone are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const normalizedPhone = normalizeCustomerPhone(phone)
  const phoneBidx = computeBlindIndex(normalizedPhone)

  const { data: existing } = await admin
    .from('customers')
    .select('id, first_name, last_name, phone, location')
    .eq('laundry_id', profile.laundryId)
    .eq('phone_bidx', phoneBidx)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      customer: {
        id: existing.id,
        firstName: decryptField(existing.first_name) ?? '',
        lastName: decryptField(existing.last_name) ?? '',
        phone: decryptField(existing.phone) ?? '',
        location: existing.location ? decryptField(existing.location) : null,
      },
    })
  }

  const customerCode = `C${Date.now().toString(36).toUpperCase().slice(-6)}`
  const { data, error } = await admin
    .from('customers')
    .insert({
      laundry_id: profile.laundryId,
      customer_code: customerCode,
      first_name: encryptField(firstName),
      last_name: encryptField(lastName),
      phone: encryptField(normalizedPhone),
      phone_bidx: phoneBidx,
      location: location ? encryptField(location) : null,
    })
    .select('id, first_name, last_name, phone, location')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    customer: {
      id: data.id,
      firstName: decryptField(data.first_name) ?? '',
      lastName: decryptField(data.last_name) ?? '',
      phone: decryptField(data.phone) ?? '',
      location: data.location ? decryptField(data.location) : null,
    },
  })
}
