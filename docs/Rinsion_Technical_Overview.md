# **Rinsion**

## **Technical Overview & System Architecture**

### **Version**

V3 Technical Specification

### **Status**

Approved for Product A Development

### **Scope**

Product A Only (Admin & Employee Operations Platform)

---

# **1. Purpose**

This document defines the technical architecture, database structure, development principles, and implementation strategy for Rinsion Product A.

The goal is to build a maintainable, scalable, and migration-friendly platform that can support future products without requiring significant rewrites.

---

# **2. Core Technical Principles**

## **Principle 1: PostgreSQL is the Source of Truth**

PostgreSQL is the long-term foundation of the platform.

Application technologies may change over time, but the database should remain stable.

### **Initial Architecture**

Next.js
   ↓
Supabase
   ↓
PostgreSQL

### **Future Architecture**

Next.js
   ↓
Java Backend
   ↓
PostgreSQL

The database should survive backend migrations.

---

## **Principle 2: Service Layer Isolation**

This is a mandatory architectural rule.

### **UI Components Must Never Communicate Directly With Supabase**

Forbidden:

const { data } = await supabase
  .from("orders")
  .select("*")

inside pages, screens, or UI components.

Required:

UI
 ↓
Service Layer
 ↓
Supabase

Example:

await createOrder()
await recordPayment()
await updateOrderStatus()
await sendOrderReadySms()

The UI should not know where data comes from.

---

## **Principle 3: Multi-Tenancy From Day One**

The platform must support multiple laundries from the beginning.

Every business entity must belong to a laundry.

No data should exist without a laundry relationship.

---

## **Principle 4: Auditability**

Every significant business action should be traceable.

Examples:

* Order creation
* Status updates
* Payment recording
* Customer updates
* Employee actions
* SMS sent / failed
* Subscription payments
* Subscription state transitions
* Plan upgrades and downgrades
* Settings changes

All actions must be recorded.

---

## **Principle 5: Provider Abstraction**

External providers (SMS, payments) sit behind abstraction interfaces.

The business logic never imports a specific provider's SDK. It calls an interface.

This applies to:

* SMS providers (mNotify at launch; future: Arkesel, Hubtel, etc.)
* Payment processors (manual MoMo at launch; future: Paystack)

---

# **3. Technology Stack**

## **Frontend**

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS

---

## **Backend Platform**

* Supabase

Used for:

* Authentication
* Database Access
* Storage (future use)
* Row Level Security

---

## **Database**

* PostgreSQL

Hosted through Supabase.

---

## **SMS Provider**

* **mNotify** (Ghana-based SMS provider)

Used for:

* Pickup code delivery on order creation
* Order ready notifications
* Subscription renewal reminders
* Quota warning notifications

Implemented behind an `SmsProvider` interface in `lib/sms/`. The `MnotifyProvider` is the only concrete implementation at launch.

Pricing reference at launch: GHS 0.0290 per SMS at bulk rate. Rinsion charges overage at GHS 0.05 per SMS, yielding approximately 72% margin.

---

## **Subscription Payments**

* **Launch:** Manual MoMo collection, marked paid via internal admin panel
* **Month 2-3 (high priority):** Paystack payment links + webhook auto-reconciliation
* **Future:** Paystack recurring subscriptions for card-using laundries

---

## **Hosting**

* Vercel

---

## **Future Providers (Not in Product A)**

* **Hubtel** — for customer-facing MoMo payment collection if interviews confirm demand
* **WhatsApp Business API** — premium notification channel via the Professional Plan

---

# **4. Multi-Tenant Architecture**

Each laundry operates as an isolated tenant.

Example:

Laundry A
 ├── Customers
 ├── Employees
 ├── Item Types
 ├── Services
 ├── Item Service Prices
 ├── Orders
 ├── Payments
 └── Subscription

Laundry B
 ├── Customers
 ├── Employees
 ├── Item Types
 ├── Services
 ├── Item Service Prices
 ├── Orders
 ├── Payments
 └── Subscription

No laundry can access another laundry's data.

---

# **5. User Roles**

## **Admin**

Permissions:

* Manage Employees
* Manage Item Types
* Manage Services
* Manage Pricing Matrix
* Manage Settings
* View Reports
* View Activity Logs
* Manage Orders (across all branches)
* Manage Customers
* Manage Subscription (view plan, initiate upgrade, view SMS usage)

---

## **Employee**

Permissions:

* Create Orders (within assigned branch)
* Update Orders
* Record Payments
* Search Customers
* Search Orders
* Mark Collections

Employees cannot:

* Manage Employees
* Manage Laundry Settings
* Edit Item Types, Services, or Pricing
* Operate across branches
* See or change subscription details

---

## **Rinsion Internal Admin (Developer Dashboard)**

Permissions:

* Access the internal Developer Dashboard
* Mark manual MoMo subscription payments as received
* View system-wide health and metrics
* Drill into any laundry's data for support

Access is gated by a hardcoded email allowlist in `lib/internal-admins.ts`. Not a row in the database.

---

# **6. Authentication**

## **Employee Authentication**

All staff authentication uses Supabase Auth.

There is no separate admin login system.
Role is determined from `employees.role`.

## **Authentication Flow**

Login
  ↓
Authenticate
  ↓
Read Role
  ↓
Check Subscription Status
  ↓
Redirect

If the laundry's subscription is `locked`, login is denied with a "Your subscription has expired" message.

If the subscription is `hard_block`, login succeeds but the UI is read-only.

If the subscription is `soft_block`, login succeeds and the system functions normally with a warning banner.

### **Role System**

ADMIN = employee with full permissions
EMPLOYEE = standard operational staff

---

# **7. Branch Context**

Each employee is assigned to exactly one branch via `employees.branch_id`. Orders they create are auto-tagged to that branch.

Admins are not bound to a single branch. When creating an order, an admin must explicitly select the branch the order belongs to. The UI presents a branch selector populated from all branches under the admin's laundry.

The selected branch is then stored on the order's `branch_id` column.

Branch creation is limited by plan:

* Starter: 1 branch maximum
* Growth: 3 branches maximum

Attempting to add a branch beyond the plan limit is blocked at the UI and at the service layer.

---

# **8. Database Schema**

## **laundries**

id (UUID)
laundry_code
name
created_at
updated_at

---

## **branches**

id (UUID)
laundry_id
branch_code
name
created_at
updated_at

Example:

Laundry: RNSN-001
Branch: RNSN-001-01

---

## **employees**

id (UUID)
auth_user_id (UUID → auth.users.id)

laundry_id
branch_id

role (ADMIN | EMPLOYEE)

first_name
last_name
email
phone (NOT NULL for both roles)

is_active

created_at
updated_at

---

## **customers**

id (UUID)
laundry_id
first_name
last_name
phone
first_visit_date
last_visit_date
created_at
updated_at
deleted_at

UNIQUE (laundry_id, phone)

Note: `total_orders` and `lifetime_revenue` are NOT stored. They are computed at read time.

---

## **item_types**

id (UUID)
laundry_id
name
is_active
created_at
updated_at
deleted_at

---

## **services**

id (UUID)
laundry_id
name
is_active
created_at
updated_at
deleted_at

---

## **item_service_prices**

id (UUID)
laundry_id
item_type_id
service_id
price
is_active
created_at
updated_at

UNIQUE (laundry_id, item_type_id, service_id)

The pricing matrix.

---

## **orders**

id (UUID)
order_number
pickup_code (5-digit numeric)

laundry_id
branch_id
customer_id

priority
status

pickup_date

subtotal
total

created_by

created_at
updated_at
deleted_at

`status` values for Product A: received, confirmed, processing, ready, collected, cancelled. The `draft` value is reserved in the enum for future Product B.

---

## **order_items**

id (UUID)
order_id

item_type_id
service_id

quantity
unit_price (locked at creation)
total_price

created_at

---

## **order_notes**

id (UUID)
order_id

note
created_by
created_at

---

## **payments**

id (UUID)
order_id
amount
payment_method
recorded_by
created_at

These are customer payments for their laundry orders. Distinct from subscription_payments.

---

## **sms_messages**

id (UUID)

laundry_id
order_id (nullable for non-order SMS like renewal reminders)
customer_id (nullable for system SMS to admin)

phone
message

trigger_event (ORDER_CREATED | ORDER_READY | PICKUP_CODE_RESEND | RENEWAL_REMINDER_3_DAYS | RENEWAL_REMINDER_1_DAY | RENEWAL_REMINDER_DAY_OF | QUOTA_WARNING_70)

provider (mnotify)
provider_message_id

status (queued | sent | failed)
counts_toward_cap (boolean, locked at send time)

created_at
sent_at
failed_at
error_message

`counts_toward_cap` logic at send time:

* TRUE for all successful customer-facing SMS
* TRUE for failed customer-facing SMS where the laundry already had ≥5 failures in the rolling prior 24 hours
* FALSE for failed customer-facing SMS where the laundry had <5 prior failures in 24 hours
* FALSE for all system-to-admin messages (renewal reminders, quota warnings)

---

## **activity_logs**

id (UUID)
laundry_id
order_id (nullable)
employee_id (nullable for system actions)
action
description
created_at

---

## **order_status_history**

id (UUID)
order_id
previous_status
new_status
employee_id
created_at

---

## **settings**

id (UUID)
laundry_id
allow_partial_payments
allow_express_orders
allow_customer_submissions
require_pickup_code
created_at
updated_at

---

## **subscriptions**

id (UUID)
laundry_id

plan (trial | starter | growth)
status (trialing | active | soft_block | hard_block | locked | cancelled)

cycle_start_date
cycle_end_date

sms_quota (300 | 800)
sms_warning_70_sent_at (nullable)

created_at
updated_at

A laundry may have only one non-cancelled subscription at a time. Historical subscription records remain in the table with status = cancelled.

---

## **subscription_payments**

id (UUID)
subscription_id
laundry_id

amount
plan_at_payment (starter | growth, snapshotted)
payment_type (cycle_renewal | upgrade_prorate | trial_conversion)

payment_method (manual_momo | paystack)
external_reference (Paystack reference, nullable)

cycle_start_date (which cycle this payment covers)
cycle_end_date

recorded_by_employee_id (Rinsion internal admin, nullable for Paystack)

paid_at
created_at

---

# **9. Order Lifecycle**

Draft (reserved, Product B only)
 ↓
Received
 ↓
Confirmed
 ↓
Processing
 ↓
Ready  ← SMS triggered
 ↓
Collected

Alternative:

Cancelled

## **Status Requirements**

Every status update must record:

Employee ID
Timestamp
Previous Status
New Status

Stored in:

order_status_history

---

# **10. Subscription Lifecycle**

Trialing (14 days, Growth-level access)
 ↓
Active (30-day cycle, Starter or Growth)
 ↓
[at cycle end without payment]
 ↓
Soft Block (days 1-6 past cycle end)
 ↓
Hard Block (days 7-12 past cycle end, read-only)
 ↓
Locked (day 13+, login denied)

Alternative paths:

* Active → Active (cycle renewal payment received)
* Active → Active at higher tier (mid-cycle upgrade, prorate paid)
* Soft Block → Active (renewal payment received)
* Hard Block → Active (renewal payment received)
* Locked → Active (renewal payment received, admin must re-engage)

## **Daily Status Update Job**

A scheduled job runs daily to advance subscription statuses based on cycle_end_date:

* `active` → `soft_block` when now() > cycle_end_date
* `soft_block` → `hard_block` after 6 days past cycle_end_date
* `hard_block` → `locked` after 12 days past cycle_end_date

Every status transition creates an `activity_logs` entry with action_type `SUBSCRIPTION_*`.

---

# **11. Notifications**

## **SMS via mNotify**

Automatic triggers:

* **ORDER_CREATED** — Order ID + 5-digit pickup code sent to customer on order creation
* **ORDER_READY** — Sent to customer when order status becomes Ready
* **RENEWAL_REMINDER_3_DAYS** — Sent to admin 3 days before subscription cycle ends
* **RENEWAL_REMINDER_1_DAY** — Sent to admin 1 day before cycle ends
* **RENEWAL_REMINDER_DAY_OF** — Sent to admin on the day the cycle ends
* **QUOTA_WARNING_70** — Sent to admin when their cycle SMS usage hits 70% (once per cycle)

Manual triggers:

* **PICKUP_CODE_RESEND** — Employee re-sends pickup code from order detail screen

Every SMS attempt is logged in `sms_messages`. Activity log entries are created for SMS_SENT and SMS_FAILED events.

## **SMS Provider Abstraction**

The notification service uses a provider-agnostic interface:

```typescript
interface SmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<SmsResult>;
}
```

Layout:

```
lib/sms/
  ├── types.ts          (SmsProvider interface, SmsResult)
  ├── mnotify.ts        (MnotifyProvider implements SmsProvider)
  ├── index.ts          (exports the active provider — mnotify at launch)
```

Service-layer notification functions in `services/notifications/` call the active provider via the interface. mNotify-specific code never leaks out of `lib/sms/`.

## **SMS Quota Enforcement**

Before sending any customer-facing SMS, the notification service:

1. Reads the laundry's active subscription
2. Computes current cycle usage from `sms_messages` (only rows where `counts_toward_cap = TRUE`)
3. If usage < quota: send normally
4. If usage = (quota × 0.7) and `sms_warning_70_sent_at IS NULL`: send the warning SMS to admin AND continue
5. If usage ≥ quota: send the SMS anyway (overage), record the overage cost for billing

The 70% warning is sent once per cycle. `sms_warning_70_sent_at` is set when sent and cleared when a new cycle begins.

## **Failure Counting (24-hour rolling)**

At send time, before recording the `sms_messages` row:

1. Count failures for this laundry in the prior 24 hours (rolling window from now)
2. If the current attempt succeeds: `counts_toward_cap = TRUE`
3. If the current attempt fails AND prior failures < 5: `counts_toward_cap = FALSE`
4. If the current attempt fails AND prior failures ≥ 5: `counts_toward_cap = TRUE`

This guards against the natural failure rate (wrong numbers, network blips) while still passing through cost on systemic abuse.

## **System Alert Thresholds (Rinsion Internal)**

The Rinsion ops team is alerted via internal dashboard and email when:

* >5% SMS failure rate across all laundries in the prior 1 hour
* >10 total SMS failures system-wide in the prior 1 hour

These thresholds catch provider outages and are independent of per-laundry counting rules.

---

# **12. Subscription System**

## **Cycle Mechanics**

Cycles are 30 days from plan start date. They do not align with the calendar month.

`cycle_start_date` and `cycle_end_date` are set when a payment is recorded.

## **Renewal Flow at Launch (Manual MoMo)**

1. Reminder SMS sent at 3 days / 1 day / day-of cycle end
2. Laundry sends MoMo payment to Rinsion's number
3. Laundry notifies Rinsion (via WhatsApp, call, or in-system "I have paid" button on dashboard)
4. Rinsion internal admin opens the Developer Dashboard → Manual Payments queue
5. Admin verifies receipt of MoMo, clicks "Mark Paid", selects plan, sets cycle dates
6. A `subscription_payments` row is created
7. The `subscriptions` row updates: status = active, new cycle dates, sms_quota for the plan, sms_warning_70_sent_at = NULL
8. Activity log entry is created

## **Renewal Flow Post-Launch (Paystack — Month 2-3)**

1. Reminder SMS sent at 3 days / 1 day / day-of, with Paystack payment link
2. Laundry clicks link → Paystack Checkout → MoMo payment
3. Paystack webhook fires to Rinsion
4. System verifies webhook signature, reads transaction details
5. Same downstream effects as manual flow (subscription_payments row, subscription update, activity log)
6. No human involvement required

## **Payment Provider Abstraction**

The subscription system uses a provider-agnostic interface for payment processing. This mirrors the SMS provider abstraction and serves the same purpose: business logic stays clean while the underlying provider can be swapped with minimal effort.

```typescript
interface PaymentProvider {
  createPaymentLink(
    amount: number,
    reference: string,
    metadata: object
  ): Promise<PaymentLink>;

  verifyWebhook(
    payload: any,
    signature: string
  ): Promise<PaymentEvent | null>;
}
```

Layout:

```
lib/payments/
  ├── types.ts        (PaymentProvider interface, PaymentLink, PaymentEvent)
  ├── manual.ts       (ManualMomoProvider — launch)
  ├── paystack.ts     (PaystackProvider — Month 2-3)
  └── index.ts        (exports the active provider)
```

### **Launch: ManualMomoProvider**

At launch, `ManualMomoProvider` is effectively a no-op for the link-creation flow:

* `createPaymentLink()` does not create a real Paystack-style link. Instead, it returns a static instruction object containing the Rinsion MoMo number and a unique reference code (used to match the payment later).
* `verifyWebhook()` is not used. Payment verification happens manually through the internal admin dashboard.

The UI does not care — it asks the active provider for "payment instructions" and renders whatever it gets back. For ManualMomoProvider, it renders the MoMo number, amount, and reference. For PaystackProvider, it renders a clickable payment link.

### **Post-Launch: PaystackProvider**

When Paystack integration ships in Month 2-3:

* `createPaymentLink()` calls Paystack's Initialize Transaction API with the amount, the reference code, and metadata (laundry_id, payment_type, target plan, cycle dates)
* `verifyWebhook()` verifies the Paystack webhook signature, parses the event, and returns a normalized `PaymentEvent` to the service layer
* The webhook handler at `/api/webhooks/paystack/route.ts` calls `verifyWebhook()` and routes confirmed payments to `recordCycleRenewalPayment()` or `recordUpgradePayment()` as appropriate

### **Switching Providers**

Changing the active payment provider requires only:

1. Implement the `PaymentProvider` interface for the new provider in `lib/payments/`
2. Update the export in `lib/payments/index.ts` to point to the new implementation

No service-layer code, no UI code, no schema changes. The same approach that lets us swap mNotify for any other SMS provider applies to payments.

---

## **Prorated Upgrades**

Math:

```
prorate_amount = days_remaining × (new_plan_daily_rate - current_plan_daily_rate)
```

Where:

* Starter daily rate: GHS 3 (= GHS 90 / 30)
* Growth daily rate: GHS 6 (= GHS 180 / 30)

Flow:

1. Admin clicks "Upgrade to Growth" on Settings → Subscription
2. System calculates prorate amount and displays it
3. Admin confirms and pays (manual MoMo or Paystack payment link)
4. Rinsion records the upgrade payment with `payment_type = upgrade_prorate`
5. Subscription updates immediately:
   * `plan` → growth
   * `sms_quota` → 800
   * `cycle_start_date` and `cycle_end_date` unchanged
   * Current SMS usage is preserved (carry-over)
6. Activity log entry created

## **Downgrade Rules**

Downgrades cannot be initiated mid-cycle while the laundry's capacity exceeds the lower plan's limits.

At cycle end, if the laundry pays the lower plan's amount and their capacity fits, they are placed on the lower plan. If not, the payment is held and the admin is contacted.

---

# **13. Background Jobs**

Rinsion runs scheduled jobs via **Vercel Cron**. Vercel Cron triggers a protected API route on schedule, and the route calls a service-layer function — keeping background logic inside the service layer like the rest of the system.

## **Why Vercel Cron**

The Next.js app already runs on Vercel. Vercel Cron is built into the platform, has no additional infrastructure cost on the Pro plan, and matches the architecture rule that all business logic lives in services. Other options considered and rejected for Product A:

* **Supabase `pg_cron`** — places business logic inside SQL stored procedures, violating the service-layer principle.
* **Supabase Edge Functions** — separate runtime (Deno), introduces a second codebase to maintain.

## **Hosting Note**

Vercel Cron is available on the Pro plan with no per-job cost. On the Hobby plan, cron is limited to 2 daily jobs per project, and the Hobby plan itself is restricted to non-commercial use. Rinsion runs on Hobby during pre-launch development and must move to Vercel Pro from the first paid customer onwards.

## **Job: Daily Subscription Advancer**

* **Path:** `/api/cron/advance-subscriptions/route.ts`
* **Schedule:** `0 0 * * *` (daily at midnight GMT — Ghana time)
* **Auth:** Verifies `Authorization: Bearer ${CRON_SECRET}` header. `CRON_SECRET` is set in Vercel environment variables and automatically attached by Vercel Cron.
* **Function called:** `services/subscriptions/advanceSubscriptionStatus.ts`

Behavior:

1. Find all subscriptions with `status IN ('active', 'soft_block', 'hard_block')` and `cycle_end_date < today`
2. For each, compute the days past cycle_end_date
3. Transition status based on days past:
   * 0 days past → no change (cycle ended exactly today, handled tomorrow)
   * 1-6 days past → `soft_block`
   * 7-12 days past → `hard_block`
   * 13+ days past → `locked`
4. For trialing subscriptions whose cycle_end_date has passed, transition to `soft_block`
5. Send renewal reminder SMS:
   * 3 days before cycle_end_date
   * 1 day before cycle_end_date
   * On cycle_end_date
6. Log every status transition and reminder in `activity_logs`

## **Configuration File**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/advance-subscriptions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## **Future Jobs (Not at Launch)**

* Daily ops digest email to the Rinsion team summarizing yesterday's activity
* Paystack webhook retry sweep (in case webhooks are lost)
* Monthly SMS usage rollup for invoicing

These can be added by appending entries to `vercel.json` without touching the existing job.

---

# **14. Payment System (Customer Orders)**

Supported Methods:

* Cash
* Mobile Money
* Card
* Bank Transfer

## **Partial Payments**

Supported per setting.

Balance is always computed from payment records. Never stored.

## **Customer Payment Collection (Future)**

Product A only records customer payments. It does not collect them through the system. Hubtel integration may be added later if interviews confirm demand.

---

# **15. Search Requirements**

Search must support:

* Order Number
* Pickup Code
* Customer Name
* Phone Number

Search is a core workflow feature. Performance should remain fast as data grows.

---

# **16. Soft Deletes**

The following entities support soft deletion via `deleted_at`:

* Orders
* Customers
* Item Types
* Services

Subscriptions and subscription_payments are NEVER soft-deleted. They are immutable financial records.

---

# **17. Pickup Code Standard**

* 5-digit numeric
* Randomly generated at order creation
* Never regenerated for the lifetime of the order
* Sent to the customer's phone via SMS automatically
* Re-sendable on demand if the customer loses it

---

# **18. Service Layer Structure**

```
src/services/

├── orders/
│   ├── createOrder.ts
│   ├── updateOrder.ts
│   ├── updateStatus.ts
│   └── getOrder.ts

├── customers/
│   ├── createCustomer.ts
│   ├── updateCustomer.ts
│   ├── findCustomerByPhone.ts
│   └── getCustomer.ts

├── payments/
│   ├── recordPayment.ts
│   ├── computeOrderBalance.ts
│   └── getPayments.ts

├── items/
│   ├── createItemType.ts
│   └── getItemTypes.ts

├── services/
│   ├── createService.ts
│   └── getServices.ts

├── pricing/
│   ├── setPrice.ts
│   ├── getPrice.ts
│   └── getPricingMatrix.ts

├── notifications/
│   ├── sendSms.ts
│   ├── sendOrderCreatedSms.ts
│   ├── sendOrderReadySms.ts
│   ├── resendPickupCodeSms.ts
│   ├── sendRenewalReminderSms.ts
│   ├── sendQuotaWarningSms.ts
│   └── computeSmsUsage.ts

├── subscriptions/
│   ├── getActiveSubscription.ts
│   ├── startTrial.ts
│   ├── recordCycleRenewalPayment.ts
│   ├── recordUpgradePayment.ts
│   ├── computeProrateAmount.ts
│   ├── advanceSubscriptionStatus.ts
│   ├── canAddBranch.ts
│   ├── canAddEmployee.ts
│   └── canDowngrade.ts

├── employees/
│   ├── createEmployee.ts
│   └── getEmployees.ts

├── reports/
│   └── getDashboardStats.ts

├── admin/   (Rinsion internal — gated by email allowlist)
│   ├── listPendingPayments.ts
│   ├── markSubscriptionPaid.ts
│   ├── getSystemHealth.ts
│   ├── getSmsHealth.ts
│   ├── searchLaundries.ts
│   └── drillIntoLaundry.ts
```

---

# **19. Supabase Isolation Rule**

Supabase should only be imported inside:

`lib/supabase.ts`

and service-layer files.

Never import Supabase inside:

* Components
* Pages
* Screens
* UI Modules

This rule is mandatory.

---

# **20. Future Java Migration Strategy**

When complexity increases:

UI → Service Layer → Supabase

becomes:

UI → Service Layer → Java API → PostgreSQL

Because UI code already depends on services rather than Supabase, migration impact remains minimal.

---

# **21. Developer Dashboard**

An internal, Rinsion-only dashboard for monitoring and operating the platform.

## **Access**

Gated by a hardcoded email allowlist in `lib/internal-admins.ts`. Only Rinsion team members can reach these routes. Routes live under `/app/internal/`.

## **Sections**

* **System Health** — API uptime, error rate (last 1h / 24h / 7d), Supabase connection status, recent errors with stack traces
* **Subscriptions** — Active counts per plan, trial expirations in next 7 days, soft-blocked, hard-blocked, churned this month, MRR
* **Manual Payments Queue** — Laundries flagged as having sent MoMo. Each row shows phone, claimed amount, plan, "Mark Paid" button
* **SMS Health** — Total sent today/month, success rate, failed deliveries with reasons, total cost so far this month, laundries currently at >70% of quota
* **Operational Metrics** — Total orders processed today across all laundries, total customers added, total payments recorded, active employees
* **Per-Laundry Drill-Down** — Search by laundry name or code, view 30-day snapshot (orders, SMS, payments, employee count, plan, billing status, last login)
* **Alerts** — Failed SMS spike, payment overdue, signups in last 24h

## **Implementation Notes**

* All queries scoped by Rinsion email allowlist, not RLS
* Reads cross all laundries (Rinsion is the operator, not a tenant)
* Writes (Mark Paid, etc.) recorded with `recorded_by_employee_id = NULL` since the internal admin is not an employee of any laundry; activity_logs entries record the internal admin's email

---

# **22. MVP Screen Map**

## **Authentication**

* Login

## **Dashboard**

* Summary Cards (including Subscription Status and SMS Usage)
* Recent Orders
* Quick Search

## **Customers**

* Customer List
* Customer Details
* Create Customer

## **Orders**

* Order List
* Create Order (Admin includes branch selector)
* Order Details (includes SMS history)
* Update Status

## **Payments**

* Record Payment
* Payment History

## **Items & Services** (Admin Only)

* Item Types List
* Services List
* Pricing Matrix

## **Employees** (Admin Only)

* Employee List
* Add Employee
* Disable Employee

## **Settings** (Admin Only)

* Laundry Settings
* Workflow Settings
* SMS Usage panel
* Subscription panel
* Plan Comparison
* Upgrade Flow

## **Reports** (Admin Only)

* Revenue Summary
* Order Summary
* Employee Activity

## **Internal Developer Dashboard** (Rinsion team only)

* System Health
* Subscriptions
* Manual Payments Queue
* SMS Health
* Per-Laundry Drill-Down
* Alerts

---

# **23. Trial Restrictions**

Trial accounts receive full Growth-tier access for 14 days. The subscription record is created with:

* `plan = trial`
* `status = trialing`
* `sms_quota = 800`
* `cycle_start_date = signup_date`
* `cycle_end_date = signup_date + 14 days`

At cycle end, the same grace period and SMS warning logic applies as any other plan.

---

# **24. Product B Readiness**

Product A is built so Product B can be added later without redesigning the database.

Future additions:

customer_accounts
customer_sessions
order_submissions
notification_preferences
loyalty_programs

The Product A architecture should remain unchanged when Product B is introduced.

The `draft` order status is reserved in the enum for Product B customer submissions.

Customer Portal features will be made available to Growth plan customers when Product B ships.

---

# **25. Success Criteria**

The MVP is successful if it enables a laundry to:

* Create customers
* Create orders with item + service pricing
* Track order status
* Send SMS notifications on key events
* Record payments
* Search records quickly
* Monitor employee activity
* Manage their Rinsion subscription
* Reduce disputes
* Maintain accountability

without requiring paper-based tracking systems.

---

# **End of Technical Overview**
