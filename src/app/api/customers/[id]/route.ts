import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getCustomer } from '@/services/customers'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customer = await getCustomer(params.id)
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const orders = (customer.orders as {
    id: string; order_number: string; status: string; total: number; created_at: string
  }[]) ?? []

  const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled')
  const totalSpent = nonCancelledOrders.reduce((s, o) => s + Number(o.total), 0)
  const initials = `${customer.first_name[0] ?? ''}${customer.last_name[0] ?? ''}`.toUpperCase()
  const memberSince = customer.first_visit_date ?? customer.created_at

  return NextResponse.json({
    id: customer.id,
    customerCode: customer.customer_code,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    firstVisitDate: customer.first_visit_date,
    lastVisitDate: customer.last_visit_date,
    createdAt: customer.created_at,
    initials,
    memberSince,
    totalSpent,
    nonCancelledCount: nonCancelledOrders.length,
    orders: orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total: Number(o.total),
      created_at: o.created_at,
      pieces: 0,
    })),
  })
}
