// Mirrors src/services/customers/getCustomersList.ts's CustomerListRow and
// the shape returned by /api/mobile/customers/[id] (getCustomer.ts on the
// website) — duplicated here rather than shared, same reasoning as
// src/types/orders.ts. Distinct from types/referenceData.ts's lighter
// CustomerListRow (used only by the order-quick-add search).

export interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  outstandingBalance: number;
  lastOrderDate: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  location: string | null;
  memberSince: string;
  lastOrderDate: string | null;
  totalOrders: number;
  totalSpent: number;
  orders: CustomerOrderSummary[];
}
