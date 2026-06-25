# **Rinsion**

## **Project Folder Structure & Development Standards**

### **Version**

V3 Development Standards

### **Status**

Approved

### **Scope**

Product A & Future Product B

---

# **Purpose**

This document defines:

* Folder organization
* Naming conventions
* Code standards
* Service architecture
* Database conventions
* TypeScript standards
* Provider abstraction patterns

The goal is consistency, maintainability, and future scalability.

---

# **Core Development Rules**

## **Rule 1: UI Never Talks Directly To Supabase**

Forbidden:

```ts
const { data } = await supabase.from("orders").select("*")
```

inside Pages, Components, Screens, or Hooks.

Required:

```ts
const orders = await getOrders();
```

through the service layer.

## **Rule 2: Business Logic Lives In Services**

Bad:

```ts
if (paymentAmount >= orderTotal) {
  setStatus("Paid");
}
```

inside components.

Good:

```ts
recordPayment();
```

Business logic stays inside services.

## **Rule 3: Components Should Be Dumb**

Components display data, collect input, trigger actions.

Components do NOT query databases, calculate business rules, or manage permissions.

## **Rule 4: One Responsibility Per File**

Bad:

```
orders.ts
  - Create Order
  - Delete Order
  - Update Order
  - Search Order
  - Payments
```

Good:

```
createOrder.ts
updateOrder.ts
deleteOrder.ts
searchOrders.ts
```

## **Rule 5: Provider Abstraction**

External providers (SMS, payments) are accessed through interfaces, not direct imports.

UI / Services never import `mNotify` or `Paystack` SDKs directly. They call methods on an abstract `SmsProvider` or `PaymentProvider` interface. Concrete providers live in `lib/sms/` and `lib/payments/`.

---

# **Recommended Folder Structure**

```
src/
├── app/
├── components/
├── features/
├── services/
├── hooks/
├── types/
├── lib/
├── constants/
├── utils/
└── middleware/
```

---

# **App Folder**

Contains routes and pages.

```
app/
├── login/
├── dashboard/
├── customers/
├── orders/
├── payments/
├── employees/
├── items-and-services/
├── reports/
├── settings/
│   ├── workflow/
│   ├── branches/
│   ├── sms-usage/
│   └── subscription/
└── internal/                  (Rinsion-only, email allowlist gated)
    ├── system-health/
    ├── subscriptions/
    ├── manual-payments/
    ├── sms-health/
    ├── laundries/
    └── alerts/
```

No business logic in this folder.

---

# **Components Folder**

Reusable UI.

```
components/
├── buttons/
├── forms/
├── tables/
├── modals/
├── navigation/
├── layout/
└── subscription/
```

Examples:

* PrimaryButton
* CustomerTable
* OrderStatusBadge
* SearchInput
* PricingMatrixGrid
* BranchSelector
* SubscriptionStatusCard
* SmsUsageCard
* SmsUsageBar
* GracePeriodBanner
* PlanComparisonTable

---

# **Features Folder**

Groups UI by business domain.

```
features/
├── customers/
├── orders/
├── payments/
├── employees/
├── items/
├── services/
├── pricing/
├── subscriptions/
├── notifications/
└── reports/
```

Example:

```
features/subscriptions/
├── SubscriptionStatusCard.tsx
├── SmsUsageCard.tsx
├── PlanComparisonScreen.tsx
├── UpgradeFlowScreen.tsx
├── PaymentInstructionsScreen.tsx
└── SubscriptionPaymentHistory.tsx
```

---

# **Services Folder**

Most important folder.

Contains all business operations.

```
services/
├── orders/
├── customers/
├── payments/
├── employees/
├── items/
├── services/
├── pricing/
├── notifications/
├── subscriptions/
├── reports/
├── settings/
├── auth/
└── admin/                     (Rinsion internal, allowlist-gated)
```

---

## **Orders Services**

```
services/orders/
├── createOrder.ts
├── getOrder.ts
├── getOrders.ts
├── updateOrder.ts
├── updateStatus.ts
├── cancelOrder.ts
├── searchOrders.ts
└── generatePickupCode.ts
```

## **Customer Services**

```
services/customers/
├── createCustomer.ts
├── getCustomer.ts
├── getCustomers.ts
├── updateCustomer.ts
└── findCustomerByPhone.ts
```

## **Payment Services**

```
services/payments/
├── recordPayment.ts
├── getPayments.ts
├── getOrderPayments.ts
└── computeOrderBalance.ts
```

## **Items Services**

```
services/items/
├── createItemType.ts
├── updateItemType.ts
├── getItemTypes.ts
└── deactivateItemType.ts
```

## **Services Services** (Service Catalogue)

```
services/services/
├── createService.ts
├── updateService.ts
├── getServices.ts
└── deactivateService.ts
```

## **Pricing Services**

```
services/pricing/
├── setPrice.ts
├── getPrice.ts
├── getPricingMatrix.ts
└── disableCombination.ts
```

## **Notification Services**

```
services/notifications/
├── sendSms.ts                       (the single send entry point)
├── sendOrderCreatedSms.ts
├── sendOrderReadySms.ts
├── resendPickupCodeSms.ts
├── sendRenewalReminderSms.ts
├── sendQuotaWarningSms.ts
├── computeSmsUsage.ts               (read-time aggregation)
├── countFailuresInLast24Hours.ts
└── getOrderSmsHistory.ts
```

`sendSms.ts` is the single chokepoint. All other functions assemble the message and call `sendSms`. `sendSms` handles:

1. Quota check (read current usage via `computeSmsUsage`)
2. Failure count check (via `countFailuresInLast24Hours`)
3. Quota warning trigger (if applicable)
4. Calling the active SMS provider
5. Persisting the `sms_messages` row with the correct `counts_toward_cap` value
6. Creating an `activity_logs` entry

The SMS provider (mNotify) is wrapped in `lib/sms/mnotify.ts`. Service functions call the provider via the `SmsProvider` interface, never directly.

## **Subscription Services**

```
services/subscriptions/
├── getActiveSubscription.ts
├── startTrial.ts                    (called on laundry signup)
├── recordCycleRenewalPayment.ts
├── recordUpgradePayment.ts
├── computeProrateAmount.ts
├── advanceSubscriptionStatus.ts     (run by daily background job)
├── canAddBranch.ts                  (plan limit check)
├── canAddEmployee.ts                (plan limit check)
├── canDowngrade.ts                  (capacity verification)
├── getSubscriptionPayments.ts
└── generatePaymentReference.ts      (unique reference for manual MoMo reconciliation)
```

## **Employee Services**

```
services/employees/
├── createEmployee.ts
├── getEmployees.ts
├── updateEmployee.ts
└── disableEmployee.ts
```

## **Reports Services**

```
services/reports/
├── getDashboardStats.ts
├── getRevenueReport.ts
├── getOrdersReport.ts
└── getEmployeeActivityReport.ts
```

## **Admin Services (Rinsion Internal)**

```
services/admin/
├── isInternalAdmin.ts               (checks the allowlist)
├── listPendingPayments.ts
├── markSubscriptionPaid.ts
├── rejectPendingPayment.ts
├── getSystemHealth.ts
├── getSmsHealth.ts
├── getSubscriptionsOverview.ts
├── searchLaundries.ts
├── drillIntoLaundry.ts
└── getActiveAlerts.ts
```

Every function here verifies the caller is on the internal admin allowlist before doing anything.

---

# **Types Folder**

All shared TypeScript types.

```
types/
├── customer.ts
├── employee.ts
├── order.ts
├── orderItem.ts
├── payment.ts
├── branch.ts
├── laundry.ts
├── itemType.ts
├── service.ts
├── itemServicePrice.ts
├── smsMessage.ts
├── settings.ts
├── subscription.ts
├── subscriptionPayment.ts
├── plan.ts
└── smsProvider.ts
```

Example:

```ts
export interface Subscription {
  id: string;
  laundryId: string;
  plan: 'trial' | 'starter' | 'growth';
  status: 'trialing' | 'active' | 'soft_block' | 'hard_block' | 'locked' | 'cancelled';
  cycleStartDate: string;
  cycleEndDate: string;
  smsQuota: number;
  smsWarning70SentAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

# **Constants Folder**

Application-wide constants.

```
constants/
├── statuses.ts
├── subscriptionStatuses.ts
├── roles.ts
├── routes.ts
├── paymentMethods.ts
├── smsTemplates.ts
├── plans.ts
└── internalAdmins.ts                (email allowlist)
```

Example:

```ts
export const ORDER_STATUSES = [
  "received",
  "confirmed",
  "processing",
  "ready",
  "collected",
  "cancelled"
];
```

The "draft" status is reserved for future Product B and is not exposed in Product A status arrays.

Plan constants:

```ts
export const PLANS = {
  starter: { price: 90, dailyRate: 3, employeeLimit: 4, branchLimit: 1, smsQuota: 300 },
  growth:  { price: 180, dailyRate: 6, employeeLimit: 9, branchLimit: 3, smsQuota: 800 },
} as const;

export const GRACE_PERIOD_SOFT_DAYS = 6;
export const GRACE_PERIOD_HARD_DAYS = 6;
export const SMS_OVERAGE_PRICE = 0.05;
export const SMS_WARNING_THRESHOLD = 0.70;
export const SMS_FAILURE_24H_THRESHOLD = 5;
export const TRIAL_DAYS = 14;
export const CYCLE_DAYS = 30;
```

---

# **Utils Folder**

Pure helper functions.

```
utils/
├── formatCurrency.ts
├── formatDate.ts
├── generatePickupCode.ts            (5-digit numeric)
├── formatPhoneNumber.ts
└── computeDaysBetween.ts
```

Utilities have no database access and no business logic.

---

# **Lib Folder**

Infrastructure.

```
lib/
├── supabase.ts
├── auth.ts
├── logger.ts
├── sms/
│   ├── types.ts                     (SmsProvider interface, SmsResult)
│   ├── mnotify.ts                   (MnotifyProvider implementation)
│   └── index.ts                     (exports the active provider)
└── payments/
    ├── types.ts                     (PaymentProvider interface)
    ├── manual.ts                    (ManualMomoProvider — launch)
    ├── paystack.ts                  (PaystackProvider — Month 2-3)
    └── index.ts
```

Only this layer initializes Supabase and external providers.

## **SMS Provider Interface**

```ts
// lib/sms/types.ts
export interface SmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<SmsResult>;
}

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}
```

## **Payment Provider Interface**

```ts
// lib/payments/types.ts
export interface PaymentProvider {
  createPaymentLink(amount: number, reference: string, metadata: object): Promise<PaymentLink>;
  verifyWebhook(payload: any, signature: string): Promise<PaymentEvent | null>;
}
```

---

# **Database Naming Standards**

Tables: `snake_case`

Examples:

```
order_items
activity_logs
item_types
item_service_prices
sms_messages
subscriptions
subscription_payments
```

Columns: `snake_case`

```
created_at
updated_at
pickup_date
customer_id
cycle_start_date
counts_toward_cap
```

---

# **TypeScript Naming Standards**

Interfaces: `PascalCase`

```
Customer
Order
Payment
Employee
ItemType
Service
ItemServicePrice
SmsMessage
Subscription
SubscriptionPayment
SmsProvider
PaymentProvider
```

Variables: `camelCase`

```
customerName
orderTotal
paymentAmount
cycleEndDate
```

Constants: `UPPER_SNAKE_CASE`

```
ORDER_STATUSES
PAYMENT_METHODS
USER_ROLES
SMS_TEMPLATES
PLANS
GRACE_PERIOD_SOFT_DAYS
```

---

# **File Naming Standards**

Service files: `camelCase.ts`

```
createOrder.ts
recordPayment.ts
updateStatus.ts
sendOrderReadySms.ts
recordCycleRenewalPayment.ts
computeProrateAmount.ts
```

React Components: `PascalCase.tsx`

```
CreateOrderForm.tsx
CustomerTable.tsx
PaymentModal.tsx
PricingMatrixGrid.tsx
BranchSelector.tsx
SubscriptionStatusCard.tsx
SmsUsageCard.tsx
PlanComparisonTable.tsx
```

---

# **API Response Standards**

Every service returns a predictable shape.

Success:

```ts
{ success: true, data: result }
```

Failure:

```ts
{ success: false, error: "Customer not found" }
```

Never throw raw database errors to the UI.

---

# **Audit Logging Standard**

Whenever these actions occur, create an `activity_logs` entry:

* Order Created
* Order Updated
* Payment Recorded
* Status Updated
* Customer Updated
* Employee Added
* SMS Sent
* SMS Failed
* Subscription Payment Recorded
* Subscription Upgraded
* Subscription Downgraded
* Subscription Status Transition (Soft Block / Hard Block / Locked)
* Settings Updated

Pattern:

```ts
createActivityLog({
  employeeId,         // null for system actions
  laundryId,
  orderId,            // null for non-order events
  actionType,
  description
});
```

---

# **Permissions Standard**

Never trust the UI.

Employees must be blocked at the service layer from:

* Employee Management
* Settings
* Reports Configuration
* Items & Services Management
* Pricing Matrix
* Subscription Management
* Branch Management

Internal Admin routes must verify the caller is on the email allowlist at every entry point.

Subscription status checks block writes when the laundry is in `hard_block` or `locked` state.

---

# **Row Level Security (RLS)**

Supabase RLS must be enabled.

Every laundry-scoped query must be scoped by `laundry_id`.

Internal admin queries bypass RLS via a service-role client only used inside `services/admin/` and only after the email allowlist check.

---

# **Soft Delete Standard**

Use `deleted_at` for:

* Orders
* Customers
* Item Types
* Services

`subscriptions` and `subscription_payments` are NEVER soft-deleted. They are immutable financial records.

---

# **Error Handling Standard**

User-facing messages:

Good:

```
Unable to record payment.
Please try again.
```

Bad:

```
PostgreSQL Error 23505
```

Technical errors are logged internally via `lib/logger.ts`.

---

# **Git Standards**

Branch Names:

```
feature/create-orders
feature/payments
feature/sms-notifications
feature/pricing-matrix
feature/subscriptions
feature/mnotify-integration
feature/paystack-integration
feature/developer-dashboard

fix/order-search
refactor/order-service
```

Commit Format:

```
feat: add order creation flow
fix: resolve payment balance bug
refactor: move order logic into services
```

---

# **Future Migration Readiness**

Architecture preserves:

```
UI → Services → Data Layer
```

Today:

```
UI → Services → Supabase
```

Future:

```
UI → Services → Java Backend → PostgreSQL
```

No UI code should require modification during this transition.

Provider abstractions (SMS, payments) also preserve future flexibility — swapping mNotify for another provider, or moving Paystack to a different processor, requires only changes inside `lib/sms/` or `lib/payments/`.

---

# **Definition of Done**

A feature is only complete when:

* ✓ Functionality works
* ✓ Input validation exists
* ✓ Permissions enforced (RLS + service layer + subscription state checks)
* ✓ Activity logs recorded
* ✓ Mobile responsive
* ✓ Error handling implemented
* ✓ TypeScript types added
* ✓ Service layer used (no direct Supabase or provider SDK calls in UI)
* ✓ Tested manually

---

# **Rinsion Engineering Principle**

Every feature must reduce at least one of:

* Lost Orders
* Lost Items
* Lost Payments
* Lost Customers
* Employee Time

If it does not contribute to one of these outcomes, it should not be included in the product.

# **End of Development Standards Document**
