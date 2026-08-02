// Mirrors src/services/riders/getMyJobs.ts, getRiderCompanyJobQueue.ts, and
// getRoster.ts/getPendingRiderInvites.ts on the website — duplicated here
// rather than shared, same reasoning as src/types/orders.ts.

import type { RiderJobStatus, RiderRole } from '@/constants/statuses';

export interface MyJob {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: 'pickup' | 'delivery';
  location: string | null;
  /** Both null until accepted — staged PII reveal. */
  customerName: string | null;
  customerPhone: string | null;
  accepted: boolean;
  riderStatus: RiderJobStatus | null;
  createdAt: string;
}

export interface RiderCompanyJob {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: 'pickup' | 'delivery';
  status: string;
  location: string | null;
  customerName: string;
  customerPhone: string;
  assignedRiderId: string | null;
  assignedRiderName: string | null;
  riderStatus: RiderJobStatus | null;
  createdAt: string;
}

export interface AssignableRider {
  id: string;
  firstName: string;
  lastName: string;
}

export interface RosterRider {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: RiderRole;
  isActive: boolean;
}

export interface PendingRiderInvite {
  id: string;
  phone: string;
  role: RiderRole;
  createdAt: string;
  expiresAt: string;
}
