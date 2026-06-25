# **Rinsion**

## **Database Relationship Diagram (ERD)**

### **Product A**

### **Version**

V3 ERD

---

# **Core Hierarchy**

Laundry
  │
  ├── Branches
  │
  ├── Employees
  │
  ├── Customers
  │
  ├── Item Types
  │
  ├── Services
  │
  ├── Item Service Prices
  │
  ├── Orders
  │
  ├── Subscriptions
  │
  └── Settings

Every major business record belongs to a Laundry.

This is the foundation of multi-tenancy.

---

# **Entity Relationships**

Laundry
│
├── Branches
├── Employees
├── Customers
├── Item Types
├── Services
├── Item Service Prices
├── Orders
├── Subscriptions
│   └── Subscription Payments
└── Settings

---

## **laundries**

laundries

PK id
laundry_code
name

created_at
updated_at

Relationship:

Laundry
 ├── Many Branches
 ├── Many Employees
 ├── Many Customers
 ├── Many Item Types
 ├── Many Services
 ├── Many Item Service Prices
 ├── Many Orders
 ├── One Active Subscription (history of past subscriptions allowed)
 └── One Settings Record

---

## **branches**

branches

PK id

FK laundry_id

branch_code
name

created_at
updated_at

Relationship:

Laundry
  ↓
Many Branches

Branch
  ↓
Many Employees

Branch
  ↓
Many Orders

---

## **employees**

employees

PK id

FK auth_user_id
FK laundry_id
FK branch_id

role

first_name
last_name
email
phone

is_active

created_at
updated_at

Constraints:

`phone` is NOT NULL for both admins and employees. The Rinsion system uses this field for subscription notifications, quota warnings, and operational communication.

Relationship:

Employee
  ↓
Creates Orders

Employee
  ↓
Records Payments

Employee
  ↓
Creates Activity Logs

Employee
  ↓
Creates Status Changes

FK auth_user_id → auth.users.id

Note: Each employee is assigned to exactly one branch. Admins may create orders for any branch in their laundry by selecting the branch at order creation time.

---

## **customers**

customers

PK id

FK laundry_id

customer_code

first_name
last_name

phone

first_visit_date
last_visit_date

created_at
updated_at
deleted_at

Constraints:

UNIQUE (laundry_id, phone)

Phone numbers are unique within a laundry. If two people share a phone, they share a customer record.

Relationship:

Customer
  ↓
Many Orders

Note: `total_orders` and `lifetime_revenue` are NOT stored. They are computed at read time from the orders table to prevent data drift.

---

## **item_types**

item_types

PK id

FK laundry_id

name

is_active

created_at
updated_at
deleted_at

Examples:

* Shirt
* T-Shirt
* Trouser
* Suit
* Dress
* Bedsheet

Relationship:

Laundry
  ↓
Many Item Types

Item Type
  ↓
Many Item Service Prices

This table replaces the previous `price_list_items` table. It only contains garment type metadata. Pricing lives in `item_service_prices`.

---

## **services**

services

PK id

FK laundry_id

name

is_active

created_at
updated_at
deleted_at

Examples:

* Wash Only
* Wash + Iron
* Iron Only
* Dry Clean
* Dry Clean + Press
* Press Only

Relationship:

Laundry
  ↓
Many Services

Service
  ↓
Many Item Service Prices

---

## **item_service_prices**

item_service_prices

PK id

FK laundry_id
FK item_type_id
FK service_id

price

is_active

created_at
updated_at

Constraints:

UNIQUE (laundry_id, item_type_id, service_id)

Relationship:

Item Type + Service + Laundry
  ↓
One Price

This is the pricing matrix. Each row represents a specific item type + service combination at a specific price for a specific laundry. Only combinations that a laundry actually offers need rows. A pillowcase that is never dry-cleaned simply has no row for that combination.

---

# **Orders**

Orders are the central operational entity.

---

## **orders**

orders

PK id

order_number
pickup_code (5-digit numeric)

FK laundry_id
FK branch_id
FK customer_id

FK created_by_employee_id

status
priority

pickup_date

subtotal
total

created_at
updated_at
deleted_at

Note: For Product A, `status` values are: received, confirmed, processing, ready, collected, cancelled. The `draft` value is reserved in the enum for future Product B customer submissions but is not used in Product A.

Relationship:

Customer
  ↓
Many Orders

Branch
  ↓
Many Orders

Employee
  ↓
Creates Many Orders

Order
  ↓
Many Order Items

Order
  ↓
Many Payments

Order
  ↓
Many Notes

Order
  ↓
Many Activity Logs

Order
  ↓
Many Status History Records

---

## **order_items**

order_items

PK id

FK order_id

FK item_type_id
FK service_id

quantity
unit_price
total_price

created_at

Note: `unit_price` is the price snapshot at the time the order was created. The order item retains this price even if the laundry later updates the `item_service_prices` matrix. This protects historical orders from pricing drift.

Relationship:

Order
  ↓
Many Order Items

Example:

Order 101

3 × Shirt (Wash + Iron) @ GHS 8 = GHS 24
2 × Shirt (Dry Clean) @ GHS 15 = GHS 30
1 × Suit (Dry Clean + Press) @ GHS 50 = GHS 50
1 × Dress (Wash Only) @ GHS 10 = GHS 10

Subtotal: GHS 114

---

## **order_notes**

order_notes

PK id

FK order_id

created_by_type
created_by_id

note

created_at

Relationship:

Order
  ↓
Many Notes

Future-proofed for:

Employee Notes
Customer Notes

without changing schema later.

---

# **Payments (Customer Order Payments)**

These are payments customers make to the laundry for their orders. Separate from Rinsion subscription payments (below).

---

## **payments**

payments

PK id

FK order_id

FK recorded_by_employee_id

amount

payment_method

created_at

Relationship:

Order
  ↓
Many Payments

Employee
  ↓
Many Recorded Payments

---

# **Status History**

---

## **order_status_history**

order_status_history

PK id

FK order_id

FK employee_id

previous_status
new_status

created_at

Relationship:

Order
  ↓
Many Status Updates

Employee
  ↓
Many Status Updates

---

# **Notifications**

---

## **sms_messages**

sms_messages

PK id

FK laundry_id
FK order_id
FK customer_id

phone
message

trigger_event

provider
provider_message_id

status
counts_toward_cap

created_at
sent_at
failed_at
error_message

Triggers:

* ORDER_CREATED (pickup code sent to customer)
* ORDER_READY (collection notification sent to customer)
* PICKUP_CODE_RESEND (manual resend by employee)
* RENEWAL_REMINDER_3_DAYS (system → admin)
* RENEWAL_REMINDER_1_DAY (system → admin)
* RENEWAL_REMINDER_DAY_OF (system → admin)
* QUOTA_WARNING_70 (system → admin)

`counts_toward_cap`:

* TRUE for all successful customer-facing SMS
* TRUE for failed customer-facing SMS where the laundry already had ≥5 failures in the rolling prior 24 hours at send time
* FALSE for customer-facing SMS that failed and the laundry had <5 prior failures in the rolling 24-hour window
* FALSE for all system-to-admin messages (renewal reminders, quota warnings)

The flag is set at send time, not computed at query time, so changes in failure history do not retroactively change which messages count.

Relationship:

Order
  ↓
Many SMS Messages

This table logs every SMS sent by the system, what triggered it, and whether delivery succeeded. Critical for debugging, dispute resolution ("the customer said they never got the SMS"), and quota accounting.

---

# **Activity Logging**

---

## **activity_logs**

activity_logs

PK id

FK laundry_id
FK order_id (nullable for non-order events)

FK employee_id (nullable for system events)

action_type

description

created_at

Examples:

ORDER_CREATED

PAYMENT_RECORDED

STATUS_UPDATED

ORDER_EDITED

CUSTOMER_UPDATED

SMS_SENT

SMS_FAILED

SUBSCRIPTION_PAYMENT_RECORDED

SUBSCRIPTION_UPGRADED

SUBSCRIPTION_DOWNGRADED

SUBSCRIPTION_GRACE_PERIOD_ENTERED

SUBSCRIPTION_HARD_BLOCK_ENTERED

SUBSCRIPTION_LOCKED

SETTINGS_UPDATED

Relationship:

Employee
  ↓
Many Activity Logs

Order
  ↓
Many Activity Logs

---

# **Settings**

---

## **settings**

settings

PK id

FK laundry_id

allow_partial_payments

allow_express_orders

allow_customer_submissions

require_pickup_code

created_at
updated_at

Relationship:

Laundry
  ↓
One Settings Record

---

# **Subscriptions**

These are the laundry's subscription to the Rinsion platform itself. Separate from order payments.

---

## **subscriptions**

subscriptions

PK id

FK laundry_id

plan
status

cycle_start_date
cycle_end_date

sms_quota
sms_warning_70_sent_at

created_at
updated_at

`plan` values:

* trial
* starter
* growth

`status` values:

* trialing
* active
* soft_block
* hard_block
* locked
* cancelled

`sms_quota` is denormalized for the current cycle (300 for Starter, 800 for Growth, 800 for Trial). It is locked at cycle start and only changes on upgrade.

`sms_warning_70_sent_at` records when the 70% threshold warning was sent in the current cycle. NULL means not yet sent. Cleared when a new cycle begins.

Relationship:

Laundry
  ↓
One Active Subscription

Subscription
  ↓
Many Subscription Payments

Note: A laundry may have only one active subscription at a time, but the table retains historical records of past subscriptions (with status = cancelled) for audit purposes.

---

## **subscription_payments**

subscription_payments

PK id

FK subscription_id
FK laundry_id

amount

plan_at_payment
payment_type

payment_method
external_reference

cycle_start_date
cycle_end_date

FK recorded_by_employee_id

paid_at
created_at

`plan_at_payment` is a snapshot of the plan this payment is for (starter | growth). Locked at payment time.

`payment_type` values:

* cycle_renewal
* upgrade_prorate
* trial_conversion

`payment_method` values:

* manual_momo
* paystack

`external_reference` stores the Paystack transaction reference when applicable. NULL for manual_momo payments.

`recorded_by_employee_id` is the Rinsion internal admin who marked a manual MoMo payment as received. NULL for Paystack auto-reconciled payments.

Relationship:

Subscription
  ↓
Many Subscription Payments

This table is the ledger of every payment a laundry has made to Rinsion. It is used for revenue reporting, dispute resolution, and Paystack reconciliation.

---

# **Future Product B Expansion**

The following tables can be added later without modifying Product A.

---

## **customer_accounts**

customer_accounts

PK id

FK customer_id

phone

is_verified

created_at

---

## **otp_verifications**

otp_verifications

PK id

FK customer_account_id

code

expires_at

created_at

---

## **customer_order_submissions**

customer_order_submissions

PK id

FK customer_account_id

status

created_at

---

# **High-Level ERD**

Laundry
│
├── Branches
│      ├── Employees
│      └── Orders
│
├── Customers
│      └── Orders
│
├── Item Types
│      └── Item Service Prices
│
├── Services
│      └── Item Service Prices
│
├── Settings
│
├── Subscriptions
│      └── Subscription Payments
│
└── Orders
      ├── Order Items (references Item Types + Services)
      ├── Notes
      ├── Payments
      ├── SMS Messages
      ├── Activity Logs
      └── Status History

---

# **Implementation Notes**

### **Use UUIDs Everywhere**

All primary keys should be UUIDs.

Never use auto-increment IDs as primary keys.

---

### **Use Soft Deletes**

Apply `deleted_at` to:

* Customers
* Orders
* Item Types
* Services

Subscriptions and subscription_payments are NEVER soft-deleted. They are an audit record.

---

### **Never Store Calculated Totals as Source of Truth**

Examples:

amount_paid
balance_due
total_orders
lifetime_revenue
sms_used_in_cycle

should always be calculated from their source tables.

`sms_used_in_cycle` for a subscription is computed as:

```
SELECT COUNT(*) FROM sms_messages
WHERE laundry_id = ?
  AND created_at >= subscription.cycle_start_date
  AND created_at < subscription.cycle_end_date
  AND counts_toward_cap = TRUE
```

If admin dashboards ever become slow at scale (years away, millions of rows), introduce a materialized view or application-layer cache. Do not premature-optimize by denormalizing.

---

### **Lock Prices on Order Items**

When an order item is created, store the `unit_price` directly on the row. Never join through `item_service_prices` at read time to display historical order totals. The matrix may change; old orders must not.

---

### **Lock Plan Snapshot on Subscription Payments**

When recording a subscription payment, store `plan_at_payment` directly. Plans may be renamed or repriced; historical payments must not change.

---

### **Pickup Code Generation**

* 5-digit numeric, random
* Generated on order creation
* Never regenerated
* Uniqueness is not required globally; the (order_id, pickup_code) pairing is what matters

---

### **Multi-Tenancy Rule**

Every query must be scoped to:

laundry_id

No exceptions.

This is one of the most important security rules in the system.

---

### **Subscription Status is Always Current**

The `subscriptions.status` field reflects the laundry's current state in real time. Background jobs update it daily:

* `active` → `soft_block` when cycle_end_date is more than 0 days in the past
* `soft_block` → `hard_block` after 6 days
* `hard_block` → `locked` after another 6 days

Status changes are logged in `activity_logs`.

---

### **Future Migration Rule**

UI → Services → Data Layer

Never:

UI → Supabase

This preserves the ability to introduce a Java backend later without rewriting the frontend.

# **End of ERD Document**
