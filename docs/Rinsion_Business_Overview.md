# **Rinsion**

## **Business Overview & Product Vision**

### **Version**

V3 Business Overview

### **Status**

Approved for Product A Development

---

# **Executive Summary**

Rinsion is a web-based laundry operations platform designed to help laundries manage customer orders, track garment processing, record payments, reduce disputes, and improve operational accountability.

The platform replaces paper notebooks, receipt books, and fragmented communication channels with a centralized digital system.

Rinsion's initial focus is laundries and dry-cleaning businesses, with the long-term possibility of expanding into other service businesses that manage customer-owned items and operational workflows.

Examples include:

* Laundries
* Dry Cleaners
* Tailors
* Shoe Repair Businesses
* Phone Repair Businesses
* Rental Businesses

The initial release (Product A) focuses entirely on laundry operations.

---

# **The Problem**

Many laundries currently rely on:

* Exercise books
* Receipt books
* WhatsApp messages
* Employee memory
* Manual calculations

This creates several problems.

### **Lost Orders**

Orders can be misplaced, forgotten, or difficult to retrieve.

### **Disputes**

Customers and staff may disagree on:

* Item quantities
* Prices
* Pickup dates
* Payment status

### **Missing Payments**

Owners often struggle to verify:

* Who received payment
* How much was received
* Which employee recorded the payment

### **Slow Customer Service**

Searching for customer records can be time-consuming and inefficient.

### **Poor Operational Visibility**

Owners often lack visibility into:

* Daily orders
* Revenue
* Employee activity
* Customer history

### **Customer Communication**

Owners spend hours calling customers to confirm orders are ready, and customers do not always know when to collect.

---

# **Vision**

Rinsion aims to become the operating system for service businesses that manage customer-owned items.

The first market is laundry businesses.

The long-term vision is to provide a complete workflow and accountability platform that helps businesses:

* Track customer items
* Manage staff activity
* Record payments
* Improve customer experience
* Reduce operational losses

---

# **Product Philosophy**

Every feature must reduce at least one of the following:

* Lost Orders
* Lost Items
* Lost Payments
* Lost Customers
* Employee Time

Features that do not contribute to one of these goals should not be included in the product.

---

# **Product A**

## **Purpose**

Product A serves laundry administrators and employees.

Its purpose is to manage the complete laundry workflow from item drop-off to collection.

---

# **User Roles**

## **Admin**

The Admin manages the laundry.

Responsibilities include:

* Managing employees
* Managing items, services, and pricing
* Viewing reports
* Managing settings
* Reviewing activity logs
* Viewing all orders and payments
* Managing the laundry's Rinsion subscription

---

## **Employee**

Employees manage day-to-day operations.

Responsibilities include:

* Creating orders
* Updating order statuses
* Recording payments
* Managing customer records
* Searching orders
* Processing collections

Admin = Employee with elevated permissions
Employee = Standard staff

Phone numbers are required for both admins and employees so the Rinsion system can reach them for subscription, quota, and operational notifications.

---

# **Branch Context**

Employees are assigned to a single branch and all orders they create are automatically tagged to that branch.

Admins may operate across multiple branches. When creating an order, an admin must select the branch the order belongs to. The system enforces this selection so every order is tied to exactly one branch.

---

# **Customer Records**

Each customer has a profile containing:

* Customer ID
* Name
* Phone Number
* First Visit Date
* Last Visit Date
* Total Orders (computed at read time)
* Lifetime Revenue (computed at read time)
* Order History

Phone numbers are unique within a single laundry. If two people share a phone, they share a customer record. Family members or roommates who want separate records must use different phones.

This allows laundries to maintain long-term customer relationships and supports future loyalty features.

---

# **Orders**

Orders are the center of the system.

Each order contains:

* Unique Order ID
* Pickup Code (5-digit numeric)
* Laundry ID
* Branch ID
* Customer ID
* Customer
* Items (each with its own service)
* Pricing
* Pickup Date
* Priority
* Notes
* Payment Information
* Activity History

---

# **Items and Services**

Laundries price their work along two dimensions: what the garment is, and what is being done to it.

## **Item Types**

Item types describe the garment. Examples:

* Shirt
* T-Shirt
* Trouser
* Suit
* Dress
* Bedsheet
* Pillowcase
* Towel
* Curtain
* Blanket

Rinsion provides a default item catalogue. Administrators may hide unused items or enable additional items.

## **Services**

Services describe the work performed on a garment. Examples:

* Wash Only
* Wash + Iron
* Iron Only
* Dry Clean
* Dry Clean + Press
* Press Only

Each laundry defines the services it offers.

## **Pricing Matrix**

Prices are set per item type per service. A shirt washed only might be GHS 5, a shirt washed and ironed GHS 8, a shirt dry cleaned GHS 15.

When an employee adds a line to an order, they pick the item type AND the service. Each line carries its own price.

A single order may contain many lines with different services:

* 3 shirts — Wash + Iron
* 2 shirts — Dry Clean
* 1 suit — Dry Clean + Press
* 1 dress — Wash Only

This matches how laundries actually price work.

---

# **Order Priorities**

Administrators may enable:

* Normal
* Express
* Urgent

These priorities may be used to offer premium processing services.

---

# **Order Notes**

Order notes may be recorded by:

* Employees
* Customers (for laundries that enable Product B features)

Examples:

* Handle with care
* Wedding suit
* Existing damage on sleeve
* Remove stain if possible
* Customer requests express processing

Each note records:

* Note Content
* Created By
* Created At

This ensures accountability and historical context.

---

# **Order Lifecycle**

Orders move through the following statuses:

1. Draft (reserved for future Product B customer submissions)
2. Received
3. Processing
4. Ready
5. Collected
6. Cancelled

**Retired: Confirmed.** Earlier revisions had a separate "Confirmed" status ("items and pricing have been verified and any disputes resolved") between Received and Processing. It was removed: `createOrder.ts` already locks items and pricing before an order row exists at all, so by the time an order reaches Received, the event Confirmed was meant to capture has already happened — it never gated any distinct behavior (no SMS, no payment check, nothing) and was purely an extra manual click. See `supabase/migrations/20240032000000_retire_confirmed_order_status.sql`.

### **Draft**

Reserved for future Product B customer submissions. Walk-in orders in Product A skip this status and go directly to Received.

### **Received**

Physical items have been received and accepted by an employee.

The system records:

* Employee ID
* Timestamp

This establishes accountability from the moment items enter the laundry's custody.

### **Processing**

Laundry work has started.

The system records:

* Employee ID
* Timestamp

### **Ready**

Order is ready for pickup.

The system records:

* Employee ID
* Timestamp

An SMS notification is sent to the customer at this point.

### **Collected**

Items have been returned to the customer.

The system records:

* Employee ID
* Timestamp

### **Cancelled**

The order has been cancelled.

The system records:

* Employee ID
* Timestamp

---

# **Status Accountability**

Every order status update must record:

* Employee ID
* Timestamp
* Previous Status
* New Status

This provides:

* Accountability
* Auditability
* Dispute resolution support
* Operational transparency

---

# **Payment Management**

Rinsion records payments for accountability purposes.

Supported payment methods include:

* Cash
* Mobile Money
* Card
* Bank Transfer

The system records:

* Amount Due
* Amount Paid (computed from payment records)
* Outstanding Balance (computed from payment records)
* Payment Method
* Payment History

Customer payment collection (where the customer pays through the system and money settles to the laundry's account) is not part of Product A. It may be added later via Hubtel or a similar Ghana-based aggregator once interviews confirm demand.

Subscription payment collection (Rinsion's monthly fees from the laundry) is a separate workstream — see the **Subscription Cycles & Renewal** section below.

---

# **Partial Payments**

Each laundry may decide whether partial payments are allowed.

If enabled:

* Multiple payments may be recorded against a single order.

If disabled:

* Full payment is required before payment can be marked complete.

---

# **Pickup Verification**

Every order receives:

* Order ID
* Pickup Code (5-digit numeric, randomly generated)

Pickup codes are enabled by default.

Administrators may disable them if desired.

Pickup codes help prevent unauthorized collections and support third-party pickups.

The pickup code is sent to the customer via SMS when the order is created.

---

# **Notifications**

Rinsion sends SMS notifications at two key points in the order lifecycle:

* **Order created** — customer receives the order ID and pickup code
* **Order ready** — customer is notified that their items are ready for collection

SMS delivery is handled through **mNotify**, a Ghana-based SMS provider.

The Rinsion notification system is built on a provider-agnostic abstraction layer. mNotify is the first implementation; future providers (Arkesel, Hubtel, etc.) can be swapped in with minimal code change. Order, customer, and payment code never communicates directly with the SMS provider.

WhatsApp notifications are not part of Product A. They are planned for the future Professional Plan once the SMS foundation is operational.

---

# **Employee Accountability**

Every significant action is recorded.

Examples include:

* Order creation
* Order edits
* Status changes
* Payment recording
* Collection confirmation
* Customer updates

Each log entry records:

* Employee ID (when applicable)
* Timestamp
* Action Performed
* Related Order

This creates a complete audit trail.

---

# **Search**

Employees can search using:

* Order ID
* Pickup Code
* Customer Name
* Phone Number

Fast search is considered a core feature.

---

# **Branch Support**

Rinsion supports multiple branches under a single laundry business.

Each laundry receives a unique Laundry ID.

Each branch receives a human-readable Branch ID derived from the Laundry ID.

Example:

Laundry:
RNSN-001

Branches:
RNSN-001-01
RNSN-001-02
RNSN-001-03

Internally, the system uses database-generated identifiers while human-readable IDs are provided for operational use and support.

Each order belongs to:

* One Laundry
* One Branch
* One Customer

Branch limits are enforced by plan tier:

* Starter Plan: 1 branch
* Growth Plan: up to 3 branches
* Future Enterprise: unlimited branches

---

# **Receipts**

The digital order record serves as the primary receipt.

Customers primarily need access to:

* Order ID
* Pickup Code
* Pickup Date
* Amount Due
* Order Status

Receipt PDFs may be generated when required.

The system is not dependent on physical printing.

If interviews confirm that customers expect a physical ticket at drop-off, a thermal printer integration may be added in a future release.

---

# **Settings**

Administrators can configure:

* Allow Partial Payments
* Allow Express Orders
* Allow Customer Submissions (Future Product B)
* Require Pickup Codes

These settings allow each laundry to tailor the platform to its workflow.

---

# **Pricing Model**

Rinsion uses a two-tier pricing structure plus a free trial.

Pricing combines:

* Employee capacity
* Branch capacity
* SMS allowance
* Feature access

## **Starter Plan**

**Price:** GHS 90 per month

**Target:** Small and growing laundries operating at a single location.

**Included Features:**

* Customer Management (records, search, history)
* Order Management (creation, tracking, status updates, notes, pickup codes, express order support)
* Payment Management (recording, partial payments, balance tracking)
* Accountability (activity logs, employee tracking, status history)
* Digital Receipts
* SMS Notifications (order created, order ready, pickup code delivery)
* Basic Dashboard (today's orders, outstanding orders, today's payments, basic reports)
* Workflow Configuration

**Limits:**

* 1 Admin
* Up to 4 Employees
* 1 Branch
* 300 SMS per cycle

## **Growth Plan**

**Price:** GHS 180 per month

**Target:** Established laundries with multiple locations or higher operational complexity.

**Includes everything in Starter, plus:**

* Advanced Reporting (Revenue, Payments, Customers, Employee Performance)
* CSV and Excel Export
* Priority Support
* Customer Portal (Coming Soon) — Customer accounts, customer login, customer order tracking, customer order history, optional customer order submission

**Limits:**

* 1 Admin
* Up to 9 Employees
* Up to 3 Branches
* 800 SMS per cycle

## **Free Trial**

Every new laundry receives:

* 14 days of full Growth Plan access
* Full operational data is collected
* No payment information required upfront

At the end of the trial:

* Usage is reviewed with the laundry
* The most appropriate plan is recommended
* If no plan is selected and no payment is made, the laundry enters the same grace period as a missed renewal

## **Future Plans (Not Available at Launch)**

These are planned for future expansion and are not part of the initial release:

* **Professional Plan** — WhatsApp automation, pickup and status notifications via WhatsApp, payment reminders, advanced workflow automation, custom branding, API access
* **Enterprise Plan** — Multi-branch management beyond 3 branches, branch-level reporting, custom domains, white-label deployments, dedicated support

---

# **Subscription Cycles & Renewal**

## **Cycle Length**

Each plan operates on a 30-day cycle that begins on the day the plan starts.

The cycle does not align with the calendar month. A laundry that starts on October 15 renews on November 14.

## **Cycle Visibility**

The Admin Dashboard always displays:

* Days remaining in the current cycle
* Amount due to renew the current plan
* Amount due to upgrade to the next tier

Example dashboard text:

*"Cycle ends in 5 days — GHS 90 to continue Starter or GHS 180 to upgrade to Growth."*

## **Renewal Reminders**

Reminder SMS messages are sent to the admin:

* 3 days before cycle end
* 1 day before cycle end
* On the day of cycle end

These messages do not count toward the laundry's SMS quota.

## **Payment Method at Launch**

At launch, subscription payments are collected manually:

1. The laundry sends payment to Rinsion's MoMo number
2. The laundry notifies the Rinsion team
3. The Rinsion team marks the subscription paid via an internal admin panel
4. The next 30-day cycle begins immediately from the date of payment

This is a temporary measure for the first few customers.

## **Payment Method Post-Launch (Month 2-3 Priority)**

Paystack integration is the **highest-priority workstream** immediately following launch. Work on Paystack integration begins during the first laundries' trial periods so it can be ready before manual collection becomes a bottleneck.

Paystack will provide:

* Per-laundry payment links for each renewal
* MoMo payment support via Paystack Checkout
* Webhook-driven auto-reconciliation when payment clears
* The same flow for prorated upgrade payments (dynamic amounts via Paystack's Initialize Transaction API)

The Rinsion team's manual involvement reduces to handling edge cases only.

## **Grace Period**

If a cycle ends without renewal:

* **Days 1-6: Soft Block**
  * A banner appears across the dashboard
  * The system remains fully usable
  * SMS reminders continue
* **Days 7-12: Hard Block**
  * The system enters read-only mode
  * Existing data can be viewed
  * New orders, payments, and edits are blocked
* **Day 13 onwards: Account Locked**
  * Login is denied until renewal is paid

This 12-day total grace period exists because owners may be traveling, may have intent to pay but be temporarily out of reach of MoMo, or may need internal time to decide on a plan tier.

---

# **Plan Changes**

## **Upgrades**

Upgrades take effect immediately.

The customer pays a prorated amount calculated as:

```
days remaining in current cycle × (new plan daily rate − current plan daily rate)
```

**Example:** A Starter customer on day 12 of their 30-day cycle upgrades to Growth.

* 18 days remaining
* Starter daily rate: GHS 3
* Growth daily rate: GHS 6
* Prorate amount: 18 × (6 − 3) = **GHS 54**

The customer pays GHS 54.

The cycle date stays the same. At the end of the cycle they renew at the new plan's full price.

SMS quota updates immediately to the new plan's allowance. Usage already consumed in the cycle is preserved.

**Example:** A Starter customer with 150 SMS used in the current cycle upgrades to Growth. Their new quota is 800. Remaining SMS for the cycle: 800 − 150 = **650**.

## **Downgrades**

Downgrades are blocked until the laundry's current usage fits the lower plan's limits.

A Growth customer with 7 employees cannot downgrade to Starter (4-employee limit) until they reduce to 4 or fewer employees.

In practice, downgrades happen at cycle end:

* The customer pays the lower plan's amount instead of the higher one
* The system verifies their current capacity fits the lower plan
* If yes, the new cycle starts on the lower plan
* If no, the payment is held and the laundry is asked to reduce capacity or pay the difference

A customer who pays nothing at cycle end is treated as non-renewing and enters the grace period.

---

# **SMS Quotas and Overage**

## **Included Allowance**

* Starter: 300 SMS per cycle
* Growth: 800 SMS per cycle

The counter resets at the start of each new cycle.

## **Overage**

Once the included allowance is exhausted, additional SMS messages cost **GHS 0.05 per message**.

Overage charges are added to the next month's invoice.

## **Warnings**

At **70% usage** of the included allowance:

* An SMS is sent to the admin's phone
* A banner appears on the admin dashboard
* The banner displays the projected overage cost based on current usage trajectory

The warning is sent once per cycle and resets when a new cycle begins.

## **Counting Rules**

Successful SMS sends always count toward the quota.

Failed SMS sends count toward the quota only when **more than 5 failures occur for the laundry within a rolling 24-hour window**. Below that threshold, failures are absorbed by Rinsion.

This protects laundries from being charged for natural failure rates (wrong customer numbers, brief network issues) while still passing through cost when there is systemic abuse or bulk wrong-number sending.

## **Renewal Reminders Are Free**

SMS reminders sent by the system to the admin (renewal reminders, quota warnings) do not count toward the quota.

---

# **Employee Accountability — Extended**

Beyond order-level accountability, the system also tracks:

* Subscription payments recorded (which employee marked a payment as received)
* Settings changes (who changed which setting, when)
* SMS delivery outcomes (which messages succeeded or failed for which orders)

---

# **Future Expansion (Product B)**

Product B introduces customer-facing functionality.

Potential features include:

* Customer accounts
* OTP login
* Order submission
* Order tracking
* Notifications
* Order history
* Loyalty rewards
* Discounts
* Digital receipts

Customer order submissions may be enabled or disabled by each laundry.

Product B will build on the same operational foundation established by Product A.

Customer Portal features will be made available to Growth plan customers when Product B ships.

---

# **Long-Term Goal**

Rinsion aims to become the preferred operational platform for laundries and similar service businesses by improving accountability, reducing disputes, simplifying order management, and creating a better customer experience.

The long-term objective is to create a scalable operational platform that can expand beyond laundry businesses while maintaining the same core principles of accountability, efficiency, and customer trust.
