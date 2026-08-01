// Mirrors the relevant slice of src/constants/statuses.ts on the website —
// duplicated (not shared) same as src/types/orders.ts, see that file's comment.

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['received', 'cancelled'],
  received: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['collected', 'cancelled'],
  collected: [],
  cancelled: [],
};

export const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  processing: 'Processing',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

export const ORDER_PRIORITIES = ['normal', 'express', 'urgent'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};
