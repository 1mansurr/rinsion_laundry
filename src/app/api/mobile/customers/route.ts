import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField, encryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getCustomersList } from '@/services/customers/getCustomersList'

export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage = Number(searchParams.get('perPage') ?? '20')
  const { rows, total } = await getCustomersList(profile.laundryId, { q, page, perPage }, createAdminClient())
  return NextResponse.json({ rows, total, page, perPage })
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
  if (error) {
    // 23505 = unique_violation on customers_laundry_phone_bidx_key — another
    // request for the same phone number won the race between our existence
    // check and this insert. Return that row instead of surfacing a raw SQL
    // error to the app.
    if (error.code === '23505') {
      const { data: winner } = await admin
        .from('customers')
        .select('id, first_name, last_name, phone, location')
        .eq('laundry_id', profile.laundryId)
        .eq('phone_bidx', phoneBidx)
        .is('deleted_at', null)
        .maybeSingle()
      if (winner) {
        return NextResponse.json({
          customer: {
            id: winner.id,
            firstName: decryptField(winner.first_name) ?? '',
            lastName: decryptField(winner.last_name) ?? '',
            phone: decryptField(winner.phone) ?? '',
            location: winner.location ? decryptField(winner.location) : null,
          },
        })
      }
      return NextResponse.json({ error: 'A customer with this phone number already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create customer.' }, { status: 500 })
  }

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
