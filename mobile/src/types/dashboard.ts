// Mirrors src/services/dashboard/getDashboardData.ts — duplicated, not shared, same reasoning as types/orders.ts.

export interface ReadyOrder {
  id: string;
  orderNumber: string;
  pickupCode: string;
  customerName: string;
  phone: string;
  branchName: string;
  readySince: string;
  balance: number;
}

export interface ActivityEntry {
  id: string;
  description: string;
  actionType: string;
  createdAt: string;
  employeeName: string;
  customerName: string;
}

export interface DashboardData {
  needsOnboarding: boolean;
  readyOrders: ReadyOrder[];
  isFirstTime: boolean;
  adminStats?: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number };
  activities: ActivityEntry[];
  showSmsBanner: boolean;
  smsUsed: number;
  smsQuota: number;
  subscriptionStatus: string | null;
  todayDate: string;
}
