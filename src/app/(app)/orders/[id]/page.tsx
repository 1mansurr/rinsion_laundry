import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOrder } from '@/services/orders'
import { OrderDetail } from './OrderDetail'
import type {
  OrderDetailNote,
  OrderDetailPayment,
  OrderDetailItem,
  OrderDetailActivity,
} from './OrderDetail'
import type { OrderStatus } from '@/constants/statuses'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const [profile, order] = await Promise.all([
    getMyProfile(),
    getOrder(params.id),
  ])

  if (!order) notFound()
  if (!profile) return null

  const supabase = createClient()

  // Enrich notes with employee author names (getOrder doesn't include this)
  const { data: rawNotes } = await supabase
    .from('order_notes')
    .select('id, note, created_at, created_by_type, created_by_id')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  const empIds = (rawNotes ?? [])
    .filter(n => n.created_by_type === 'employee' && n.created_by_id)
    .map(n => n.created_by_id as string)

  let authorNames: Record<string, string> = {}
  if (empIds.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .in('id', empIds)
    authorNames = Object.fromEntries(
      (emps ?? []).map(e => [e.id, `${e.first_name} ${e.last_name}`])
    )
  }

  const notes: OrderDetailNote[] = (rawNotes ?? []).map(n => ({
    id: n.id,
    note: n.note,
    createdAt: n.created_at,
    authorName: n.created_by_id ? (authorNames[n.created_by_id] ?? '') : '',
  }))

  // Activity log for this order
  const { data: activityRows } = await supabase
    .from('activity_logs')
    .select('id, description, created_at, employees(first_name, last_name)')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  const activities: OrderDetailActivity[] = (activityRows ?? []).map(a => {
    const emp = a.employees as unknown as { first_name: string; last_name: string } | null
    return {
      id: a.id as string,
      description: a.description as string,
      createdAt: a.created_at as string,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : '',
    }
  })

  // Shape data from getOrder response
  const customer = order.customers as unknown as { id: string; first_name: string; last_name: string; phone: string } | null
  const branch = order.branches as unknown as { name: string } | null

  const items: OrderDetailItem[] = ((order.order_items as unknown as {
    id: string; quantity: number; unit_price: number; total_price: number;
    item_types: { name: string } | null; services: { name: string } | null
  }[]) ?? []).map(item => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    totalPrice: Number(item.total_price),
    itemTypeName: item.item_types?.name ?? '—',
    serviceName: item.services?.name ?? '—',
  }))

  const payments: OrderDetailPayment[] = ((order.payments as {
    id: string; amount: number; payment_method: string; created_at: string
  }[]) ?? []).map(p => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.payment_method,
    createdAt: p.created_at,
  }))

  const amountPaid = payments.reduce((s, p) => s + p.amount, 0)

  // Cancelled metadata — find what status the order was in when cancelled
  const statusHistory = (order.order_status_history as {
    previous_status: string | null; new_status: string; created_at: string
  }[]) ?? []

  const cancelEntry = statusHistory.find(h => h.new_status === 'cancelled')
  const cancelledAt = cancelEntry?.created_at ?? null
  const previousStatusOnCancel = cancelEntry?.previous_status ?? null

  return (
    <OrderDetail
      orderId={order.id}
      orderNumber={order.order_number}
      status={order.status as OrderStatus}
      priority={order.priority ?? 'normal'}
      pickupCode={order.pickup_code}
      pickupDate={order.pickup_date ?? null}
      total={Number(order.total)}
      amountPaid={amountPaid}
      customerName={customer ? `${customer.first_name} ${customer.last_name}` : '—'}
      customerId={customer?.id ?? ''}
      customerPhone={customer?.phone ?? ''}
      branchName={branch?.name ?? ''}
      createdAt={order.created_at}
      cancelledAt={cancelledAt}
      previousStatusOnCancel={previousStatusOnCancel}
      items={items}
      payments={payments}
      notes={notes}
      activities={activities}
    />
  )
}
