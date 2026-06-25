/**
 * types/order.ts
 *
 * TypeScript types for orders, order_items, order_notes, and order_status_history.
 * Spec reference: Rinsion_Database_Diagram.md → Orders section
 */

import type { OrderStatus, OrderPriority } from '@/constants/statuses'

export interface Order {
  id: string
  orderNumber: string
  pickupCode: string
  laundryId: string
  branchId: string
  customerId: string
  createdByEmployeeId: string
  status: OrderStatus
  priority: OrderPriority
  pickupDate: string | null
  subtotal: number
  total: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface OrderItem {
  id: string
  orderId: string
  itemTypeId: string
  serviceId: string
  quantity: number
  /** Locked at creation time — never re-read from item_service_prices */
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export interface OrderNote {
  id: string
  orderId: string
  /** 'employee' or 'customer' (future Product B) */
  createdByType: string
  createdById: string | null
  note: string
  createdAt: string
}

export interface OrderStatusHistory {
  id: string
  orderId: string
  employeeId: string
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  createdAt: string
}

export interface CreateOrderInput {
  laundryId: string
  branchId: string
  customerId: string
  createdByEmployeeId: string
  priority?: OrderPriority
  pickupDate?: string
  items: CreateOrderItemInput[]
  note?: string
}

export interface CreateOrderItemInput {
  itemTypeId: string
  serviceId: string
  quantity: number
  unitPrice: number
}
