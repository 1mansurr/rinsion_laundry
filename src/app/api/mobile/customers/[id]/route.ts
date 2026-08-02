import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField, encryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'

interface Params {
  params: { id: string }
}

/**
 * Mirrors services/customers/getCustomer.ts, but explicitly scoped to
 * profile.laundryId (getCustomer.ts relies on RLS via the cookie-session
 * client, which the admin client bypasses — same reasoning as every other
 * mobile route in this directory).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('customers')
    .select(`
      id, first_name, last_name, phone, location, first_visit_date, last_visit_date, created_at,
      orders(id, order_number, status, total, created_at, payments(amount))
    `)
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .is('deleted_at', null)
    .single()
  if (!data) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })

  const orders = (data.orders ?? []) as unknown as {
    id: string; order_number: string; status: string; total: number; created_at: string
    payments: { amount: number }[]
  }[]
  const nonCancelled = orders.filter(o => o.status !== 'cancelled')
  const totalSpent = nonCancelled.reduce((s, o) => s + (o.payments ?? []).reduce((ps, p) => ps + Number(p.amount), 0), 0)

  return NextResponse.json({
    customer: {
      id: data.id,
      firstName: decryptField(data.first_name) ?? '',
      lastName: decryptField(data.last_name) ?? '',
      phone: decryptField(data.phone) ?? '',
      location: data.location ? decryptField(data.location) : null,
      memberSince: data.first_visit_date ?? data.created_at,
      lastOrderDate: data.last_visit_date,
      totalOrders: nonCancelled.length,
      totalSpent,
      orders: orders
        .map(o => ({ id: o.id, orderNumber: o.order_number, status: o.status, total: Number(o.total), createdAt: o.created_at }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    },
  })
}

/** Mirrors services/customers/updateCustomer.ts via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { firstName?: string; lastName?: string; phone?: string; location?: string } | null
  const firstName = body?.firstName?.trim()
  const lastName = body?.lastName?.trim()
  const phone = body?.phone?.trim()
  const location = body?.location?.trim()
  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: 'First name, last name, and phone are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const normalizedPhone = normalizeCustomerPhone(phone)
  const phoneBidx = computeBlindIndex(normalizedPhone)

  const { error } = await admin
    .from('customers')
    .update({
      first_name: encryptField(firstName),
      last_name: encryptField(lastName),
      phone: encryptField(normalizedPhone),
      phone_bidx: phoneBidx,
      location: location ? encryptField(location) : null,
    })
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Another customer already has this phone number.' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to update customer.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
