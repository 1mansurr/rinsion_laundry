import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getOrdersList } from '@/services/orders/getOrdersList'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { validatePriceRanges } from '@/services/pricing/validatePriceRanges'
import { generatePickupCode } from '@/utils/generatePickupCode'
import { generateOrderNumber } from '@/utils/generateOrderNumber'
import { encryptField } from '@/lib/crypto'
import { findIdempotentResponse, storeIdempotentResponse } from '@/services/mobile/idempotency'
import type { OrderPriority, PricingMode } from '@/constants/statuses'

interface CreateOrderResponse {
  orderId: string
  orderNumber: string
  pickupCode: string
}

export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage = 30

  const { rows, total } = await getOrdersList(
    profile.laundryId,
    { q, status, page, perPage },
    createAdminClient()
  )

  return NextResponse.json({ rows, total, page, perPage })
}

interface CreateOrderBody {
  customerId: string
  priority: OrderPriority
  pickupDate?: string
  notes?: string
  location?: string
  /** Set by the mobile app's offline queue on a replayed create — see idempotency.ts. */
  clientRequestId?: string
  items: {
    itemTypeId?: string
    serviceId: string
    quantity: number
    unitPrice: number
    totalPrice: number
    pricingMode: PricingMode
  }[]
}

/** Mirrors services/orders/createOrder.ts (same create_order_tx RPC, same price validation) via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as CreateOrderBody | null
  if (!body?.customerId || !body.items?.length) {
    return NextResponse.json({ error: 'Customer and at least one item are required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (body.clientRequestId) {
    const existing = await findIdempotentResponse<CreateOrderResponse>(admin, profile.laundryId, body.clientRequestId)
    if (existing) return NextResponse.json(existing)
  }

  const priceError = await validatePriceRanges(admin, profile.laundryId, body.items)
  if (priceError) return NextResponse.json({ error: priceError.error }, { status: 400 })

  const { data: settingsRow } = await admin
    .from('settings')
    .select('tax_rate')
    .eq('laundry_id', profile.laundryId)
    .single()

  const orderNumber = generateOrderNumber()
  const subtotal = body.items.reduce((s, i) => s + i.totalPrice, 0)
  const taxRate = Number(settingsRow?.tax_rate ?? 0)
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const total = subtotal + taxAmount
  const branchId = await getSoleBranchId(profile.laundryId, admin)
  if (!branchId) return NextResponse.json({ error: 'No branch found for this laundry.' }, { status: 400 })

  let pickupCode = generatePickupCode()
  let created: { order_id: string; order_number: string; pickup_code: string } | null = null
  let rpcErr: { code?: string; message: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await admin
      .rpc('create_order_tx', {
        p_order_number: orderNumber,
        p_pickup_code: pickupCode,
        p_laundry_id: profile.laundryId,
        p_branch_id: branchId,
        p_customer_id: body.customerId,
        p_employee_id: profile.employeeId,
        p_priority: body.priority,
        p_pickup_date: body.pickupDate ?? null,
        p_subtotal: subtotal,
        p_tax_amount: taxAmount,
        p_total: total,
        p_items: body.items.map(item => ({
          item_type_id: item.itemTypeId ?? null,
          service_id: item.serviceId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          pricing_mode: item.pricingMode,
        })),
        p_note: body.notes?.trim() || null,
        p_location: body.location?.trim() ? encryptField(body.location.trim()) : null,
      })
      .single()

    if (!result.error) {
      created = result.data as { order_id: string; order_number: string; pickup_code: string }
      rpcErr = null
      break
    }
    rpcErr = result.error
    if (result.error.code !== '23505' || !result.error.message.includes('pickup_code')) break
    pickupCode = generatePickupCode()
  }

  if (!created) return NextResponse.json({ error: rpcErr?.message ?? 'Failed to create order.' }, { status: 500 })

  import('@/services/notifications/sendOrderCreatedSms')
    .then(m => m.sendOrderCreatedSms(created!.order_id))
    .catch(() => null)

  const response: CreateOrderResponse = {
    orderId: created.order_id,
    orderNumber: created.order_number,
    pickupCode: created.pickup_code,
  }
  if (body.clientRequestId) {
    await storeIdempotentResponse(admin, profile.laundryId, body.clientRequestId, response)
  }
  return NextResponse.json(response)
}
