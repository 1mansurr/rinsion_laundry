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

export const EMPLOYEE_ROLE = { ADMIN: 'admin', EMPLOYEE: 'employee' } as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLE)[keyof typeof EMPLOYEE_ROLE];

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Admin',
  employee: 'Employee',
};

export const RIDER_ROLE = { ADMIN: 'admin', RIDER: 'rider' } as const;
export type RiderRole = (typeof RIDER_ROLE)[keyof typeof RIDER_ROLE];

/** Mirrors rider_job_status — symmetric across pickup/delivery kind, see the website's migration comment. */
export const RIDER_JOB_STATUSES = ['assigned', 'en_route', 'picked_up', 'dropped_off'] as const;
export type RiderJobStatus = (typeof RIDER_JOB_STATUSES)[number];

/** Statuses a rider can move a job forward to — excludes 'assigned', which only a company admin sets via the queue. */
export const NEXT_RIDER_JOB_STATUSES: RiderJobStatus[] = ['en_route', 'picked_up', 'dropped_off'];

export const RIDER_JOB_STATUS_LABELS: Record<RiderJobStatus, string> = {
  assigned: 'Assigned',
  en_route: 'En route',
  picked_up: 'Picked up',
  dropped_off: 'Dropped off',
};
