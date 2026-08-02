// Mirrors src/services/employees/getEmployees.ts, getPendingInvites.ts, and
// src/services/laundries/getPendingJoinRequests.ts — duplicated, not shared,
// same reasoning as types/orders.ts.

import type { EmployeeRole } from '@/constants/statuses';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  role: EmployeeRole;
  isActive: boolean;
}

export interface PendingInvite {
  id: string;
  phone: string;
  role: EmployeeRole;
  createdAt: string;
  expiresAt: string;
}

export interface PendingJoinRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
}
