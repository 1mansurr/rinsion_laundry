// Mirrors src/services/settings/*, src/services/subscriptions/*, and the
// recycle-bin get-deleted services on the website — duplicated, not shared,
// same reasoning as types/orders.ts.

import type { PricingModel } from '@/constants/statuses';

export interface Laundry {
  id: string;
  name: string;
  laundryCode: string;
  joinPin: string;
}

export interface WorkflowSettings {
  allowExpressOrders: boolean;
  requirePickupCode: boolean;
  allowCustomerSubmissions: boolean;
  pricingModel: PricingModel;
  taxRate: number;
}

export interface Branch {
  id: string;
  name: string;
}

export interface ActiveSubscription {
  id: string;
  plan: string;
  status: string;
  cycleStartDate: string;
  cycleEndDate: string;
  smsQuota: number;
  daysLeft: number;
  employeeLimit: number;
}

export interface RecentPayment {
  id: string;
  amount: number;
  payment_type: string;
  plan_at_payment: string;
  paid_at: string;
}

export interface PendingClaim {
  id: string;
  reference_code: string;
  claimed_amount: number;
  target_plan: string;
  claimed_at: string;
}

export interface SubscriptionPageData {
  subscription: ActiveSubscription | null;
  recentPayments: RecentPayment[];
  existingClaim: PendingClaim | null;
  paymentType: 'cycle_renewal' | 'trial_conversion' | 'upgrade_prorate' | null;
  targetPlan: string | null;
  paymentAmount: number | null;
  newCycleStart: string | null;
  newCycleEnd: string | null;
  referenceCode: string | null;
  momoNumber: string;
  employeePhone: string;
  paystackLink: {
    referenceCode: string;
    status: 'pending' | 'paid' | 'failed' | 'expired';
    displayText: string | null;
    amount: number;
  } | null;
}

export interface SmsMessageRow {
  id: string;
  trigger_event: string;
  status: string;
  phone: string;
  counts_toward_cap: boolean;
  created_at: string;
  error_message: string | null;
}

export interface SmsUsageData {
  subscription: { cycleStartDate: string; cycleEndDate: string; smsQuota: number } | null;
  smsUsed: number;
  quota: number;
  usagePct: number;
  messages: SmsMessageRow[];
}

export interface DeletedCustomer { id: string; firstName: string; lastName: string; phone: string; deletedAt: string }
export interface DeletedOrder { id: string; orderNumber: string; status: string; total: number; customerName: string; deletedAt: string }
export interface DeletedItemType { id: string; name: string; deletedAt: string }
export interface DeletedService { id: string; name: string; deletedAt: string }
export interface DeletedEmployee { id: string; firstName: string; lastName: string; role: string; deletedAt: string }

export interface RecycleBinData {
  customers: DeletedCustomer[];
  orders: DeletedOrder[];
  itemTypes: DeletedItemType[];
  services: DeletedService[];
  employees: DeletedEmployee[];
}
