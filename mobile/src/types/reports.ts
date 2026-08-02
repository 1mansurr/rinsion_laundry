// Mirrors src/services/reports/index.ts — duplicated, not shared, same reasoning as types/orders.ts.

export interface RevenueReport {
  totalAllTime: number;
  thisMonth: number;
  today: number;
  outstandingBalance: number;
}

export interface OrdersReport {
  totalAllTime: number;
  thisMonth: number;
  today: number;
  byStatus: Record<string, number>;
}

export interface EmployeeActivityItem {
  employeeId: string;
  name: string;
  ordersCreated: number;
  paymentsRecorded: number;
  statusUpdates: number;
}

export interface AllReports {
  revenue: RevenueReport;
  orders: OrdersReport;
  employeeActivity: EmployeeActivityItem[];
}
