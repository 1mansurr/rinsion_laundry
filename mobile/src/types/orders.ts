// Mirrors src/services/orders/getOrdersList.ts's OrderListRow and
// src/services/orders/getOrderDetail.ts's OrderDetailData on the website —
// duplicated here rather than shared across the two separate projects (no
// monorepo/shared-package setup yet, and these are small, stable shapes).

export interface OrderListRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerInitials: string;
  customerPhone: string;
  branchName: string;
  pieces: number;
  kg: number;
  status: string;
  total: number;
  balance: number;
  createdAt: string;
}

export interface OrderDetailItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pricingMode: 'per_item' | 'per_kg';
  itemTypeName: string;
  serviceName: string;
}

export interface OrderDetailData {
  orderId: string;
  orderNumber: string;
  status: string;
  priority: string;
  pickupCode: string;
  pickupDate: string | null;
  location: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  customerName: string;
  customerPhone: string;
  branchName: string;
  createdAt: string;
  items: OrderDetailItem[];
  payments: { id: string; amount: number; paymentMethod: string; createdAt: string }[];
}
