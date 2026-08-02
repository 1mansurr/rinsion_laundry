// Mirrors src/services/payments/getPayments.ts's PaymentListRow/PaymentsSummary — duplicated, not shared, same reasoning as types/orders.ts.

export interface PaymentRow {
  id: string;
  receiptId: string;
  date: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  method: string;
  amount: number;
  recordedBy: string;
}

export interface PaymentsSummary {
  collectedToday: number;
  collectedThisWeek: number;
  outstandingBalance: number;
}
