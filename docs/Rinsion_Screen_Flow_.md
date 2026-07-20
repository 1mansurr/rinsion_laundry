# **Rinsion**

## **Screen Flow & User Journey Document**

### **Version**

V3 Product A

### **Scope**

Admin & Employee Workflows + Rinsion Internal Developer Dashboard

---

# **Purpose**

This document defines how users move through the system.

It focuses on:

* Screen navigation
* User workflows
* Operational processes
* Permission boundaries

The goal is to ensure every major business process can be completed efficiently.

---

# **User Types**

## **Admin**

Responsible for:

* Managing the laundry
* Managing employees
* Managing items, services, and pricing
* Managing settings
* Monitoring operations
* Managing the Rinsion subscription

## **Employee**

Responsible for:

* Managing customers
* Managing orders
* Recording payments
* Processing pickups

## **Rinsion Internal Admin**

Responsible for:

* Monitoring system health
* Marking manual MoMo subscription payments
* Supporting laundries
* Identifying SMS or system issues

Access is gated by email allowlist. Not exposed to laundries.

---

# **Global Navigation**

## **Admin Navigation**

Dashboard
Customers
Orders
Payments
Employees
Items & Services
Reports
Settings
Profile
Logout

## **Employee Navigation**

Dashboard
Customers
Orders
Payments
Profile
Logout

## **Internal Admin Navigation (Separate App Section)**

System Health
Subscriptions
Manual Payments
SMS Health
Laundries
Alerts

---

# **Authentication Flow**

## **Login Screen**

Fields:

Email
Password

Actions:

Login
Forgot Password

## **Login Journey**

Login
 ↓
Authentication (Supabase Auth)
 ↓
Fetch Employee Profile
 ↓
Check Subscription Status
 ↓
Role Detection
 ↓
Redirect

If subscription status is `locked`, login is blocked with a clear message:

*"Your Rinsion subscription has expired. Please complete payment to restore access."*

If subscription is `hard_block`, login succeeds and the user enters the system in read-only mode with a persistent banner.

If subscription is `soft_block`, login succeeds normally with a warning banner.

---

# **Dashboard**

## **Admin Dashboard**

### **Top Banner Area**

If applicable, a banner shows:

* SMS quota warning (≥70% usage)
* Subscription renewal reminder (3 days, 1 day, day-of)
* Soft block warning (post-renewal grace period)
* Hard block notice (read-only mode)

### **Summary Cards**

* Today's Orders
* Orders Ready
* Orders Processing
* Today's Payments
* Outstanding Payments
* Customers Served

### **Subscription Status Card**

A dedicated card showing:

*"Cycle ends in X days"*

*"GHS 120 to continue Starter — or — GHS 180 to upgrade to Growth"*

Actions:

* View Subscription
* Mark Renewal Paid (opens the payment instructions screen)
* Upgrade Plan

### **SMS Usage Card**

A dedicated card showing:

* Messages used this cycle / quota (e.g., 235 / 300)
* Visual progress bar
* Delivered count
* Failed count
* Overage cost so far (if any)
* Cycle reset date

Tap → SMS Usage Detail screen (in Settings)

### **Other Sections**

* Recent Orders
* Recent Payments
* Employee Activity

### **Actions**

* Create Customer
* Create Order
* Search

---

## **Employee Dashboard**

Cards:

* Today's Orders
* Ready For Pickup
* Processing Orders

Sections:

* Recent Orders
* Assigned Activity

Actions:

* Create Customer
* Create Order
* Search

Note: Employees do NOT see subscription or SMS usage cards. Those are admin-only concerns.

---

# **Customer Management**

## **Customer List Screen**

Displays:

* Customer Name
* Phone Number
* Last Visit
* Total Orders (computed)

Search:

* Name
* Phone Number

Actions:

* View
* Create Customer

## **Create Customer Screen**

Fields:

* First Name
* Last Name
* Phone Number

The system enforces phone uniqueness within the laundry. If the phone number already exists, the existing customer record is shown instead of creating a duplicate.

Actions:

* Save Customer
* Cancel

System automatically creates Customer ID.

## **Customer Detail Screen**

Displays:

* Customer Information
* Order History
* Lifetime Revenue (computed)
* Last Visit

Actions:

* Create Order
* Edit Customer

---

# **Items & Services Management**

(Admin Only)

This section manages the pricing matrix.

## **Item Types Screen**

Displays:

* Item Type Name
* Active / Inactive

Actions:

* Add Item Type
* Edit
* Deactivate

## **Services Screen**

Displays:

* Service Name
* Active / Inactive

Actions:

* Add Service
* Edit
* Deactivate

## **Pricing Matrix Screen**

Displays a grid:

* Rows = Item Types
* Columns = Services
* Cells = Price

Each cell can be:

* A price (active combination)
* Empty (combination not offered)

Actions:

* Edit Price
* Disable Combination
* Enable Combination

---

# **Order Management**

This is the most important workflow in the system.

## **Walk-In Customer Workflow**

Customer arrives physically.

Employee:

* Search Customer
* If found: Open Customer → Create Order
* If not found: Create Customer → Create Order

## **Create Order Screen**

### **Section 1 — Customer**

Customer Name
Phone Number (auto-filled)

### **Section 2 — Branch (Admin Only)**

If the current user is an Admin, a branch selector is shown. The Admin must select which branch the order belongs to before items can be added.

Employees do not see this section. Their orders are auto-tagged to their assigned branch.

### **Section 3 — Order Information**

* Pickup Date
* Priority (Normal / Express / Urgent — visible if enabled)

### **Section 4 — Items**

For each line:

* Item Type (Shirt, Trouser, Suit, ...)
* Service (Wash Only, Wash + Iron, Dry Clean, ...)
* Quantity

The system looks up the price from the pricing matrix and displays:

* Unit Price
* Line Total

### **Section 5 — Order Notes**

* Special Instructions
* Damage Notes
* Customer Requests

### **Section 6 — Summary**

* Item Count
* Order Total
* Pickup Date

Actions:

* Create Order
* Cancel

## **Order Created**

System generates:

* Order ID
* Pickup Code (5-digit numeric)

Initial status: Received

System sends SMS to customer with Order ID and Pickup Code.

---

# **Order Detail Screen**

Displays:

* Order ID
* Pickup Code
* Customer
* Items (with item type, service, quantity, unit price)
* Notes
* Payment Summary (Amount Due, Amount Paid computed, Balance computed)
* Activity History
* SMS History
* Current Status

Actions:

* Update Status
* Record Payment
* Edit Order
* Resend Pickup Code SMS

---

# **Status Management**

Order Detail Screen → Update Status

Available transitions:

Received → Confirmed → Processing → Ready → Collected

Alternative: Cancelled

When status moves to Ready, the system sends an SMS to the customer notifying them their order is ready for collection.

Every update records Employee ID, Timestamp, Previous Status, New Status.

---

# **Payment Management (Customer Orders)**

## **Record Payment Screen**

Displays:

* Order Total
* Amount Paid (computed)
* Outstanding Balance (computed)

Fields:

* Payment Amount
* Payment Method (Cash / Mobile Money / Card / Bank Transfer)

Action: Record Payment

## **Payment History**

Displays Date, Amount, Method, Employee.

All payment records remain permanent.

---

# **Pickup Workflow**

## **Customer Arrives**

Employee searches by:

* Order ID
* Pickup Code
* Phone Number

## **Pickup Verification**

Customer provides Pickup Code → Employee verifies.

If the customer has lost the code, the employee may resend the SMS to the registered phone. The customer reads the code back from their phone.

## **Collection Screen**

Displays Customer, Order, Items, Payment Status.

Checks:

* Is Order Ready?
* Is Payment Complete?

Action: Mark Collected

System records Employee ID and Timestamp. Status becomes Collected.

---

# **Employee Management**

(Admin Only)

## **Employee List**

Displays: Employee Name, Role, Branch, Phone, Status

Actions: Add Employee, Disable Employee

## **Add Employee**

Fields:

* First Name
* Last Name
* Email
* Phone (required)
* Branch
* Role (Admin / Employee)

System sends Account Invitation.

If adding this employee would exceed the plan's employee limit, the action is blocked with an "Upgrade to Growth" CTA.

---

# **Reports**

(Admin Only)

## **Revenue Report**

Displays Revenue, Outstanding Balances, Payments Received.

## **Orders Report**

Displays Orders Created, Orders Collected, Orders Cancelled.

## **Employee Activity Report**

Displays Orders Created, Payments Recorded, Status Updates per employee.

---

# **Settings**

(Admin Only)

## **Laundry Settings**

* Laundry Name
* Branch Information

## **Workflow Settings**

Toggles:

* Allow Partial Payments
* Allow Express Orders
* Require Pickup Code
* Allow Customer Submissions

---

## **Branch Management**

Displays current branches and their codes.

Action: Add Branch

If adding a branch would exceed the plan's branch limit, the action is blocked with an "Upgrade to Growth" CTA.

---

## **SMS Usage Panel**

Detailed view of SMS for the current cycle:

* Messages sent this cycle (X / quota)
* Visual progress bar
* Delivered breakdown
* Failed breakdown (with reasons)
* Overage so far (count + cost in GHS)
* Projected overage cost (based on current trajectory)
* Cycle reset date

Below the summary, a chronological list of recent SMS:

* Date / time
* Phone
* Trigger event
* Status (Delivered / Failed)
* Counts toward cap (Yes / No)

---

## **Subscription Panel**

Displays:

* Current Plan (Starter / Growth / Trial)
* Cycle Start Date
* Cycle End Date
* Days Remaining
* Plan Benefits Summary
* Recent Subscription Payments

Actions:

* View Plan Comparison
* Upgrade Plan
* Mark Renewal Paid

---

# **Plan Comparison Screen**

Side-by-side comparison of Starter vs Growth:

* Price
* Employees
* Branches
* SMS allowance
* Features (with checkmarks)
* Customer Portal (Growth — "Coming Soon" label)

Actions:

* Stay on Current Plan
* Upgrade to Growth

---

# **Upgrade Flow Screen**

When admin initiates an upgrade:

### **Step 1 — Prorate Calculation**

Displays the math clearly:

```
You are on Starter — GHS 3/day
Upgrading to Growth — GHS 6/day
Days remaining in cycle: 18

Prorate amount = 18 × (6 − 3) = GHS 54
```

The customer's current SMS usage carries over. New quota: 800. Already used: 150. Remaining for cycle: 650.

### **Step 2 — Payment**

If manual MoMo (launch):

* Display Rinsion MoMo number
* Display exact amount (GHS 54)
* Display reference code (so Rinsion can match the payment)
* Action: "I have sent the payment"

If Paystack (Month 2-3):

* Generate Paystack payment link with the prorate amount
* Open Paystack Checkout
* On success, auto-update subscription

### **Step 3 — Confirmation**

After payment is verified:

* Subscription updates immediately
* SMS quota updates
* Confirmation screen shows new plan, new quota, cycle dates unchanged

---

# **Subscription Payment Instructions Screen**

Used for both cycle renewals and upgrades (when on manual MoMo).

Displays:

* Rinsion MoMo Number
* Exact Amount Due
* Reference Code (unique per payment, used by Rinsion to match)
* Step-by-step instructions

Actions:

* Copy MoMo Number
* Copy Reference Code
* "I have sent the payment" button

When the admin taps "I have sent the payment", the system:

1. Logs the action in activity_logs
2. Adds the laundry to the Rinsion internal admin's Manual Payments Queue
3. Shows the admin a "Payment received by Rinsion — your subscription will be updated within 24 hours" message
4. Sends an internal alert email to the Rinsion team

---

# **Search**

Search is accessible globally via the top navigation search box.

Search by:

* Order ID
* Pickup Code
* Phone Number
* Customer Name

Results should appear within seconds.

---

# **Mobile Responsiveness**

Product A is a web application.

Primary devices:

* Admin: Mobile + Desktop
* Employee: Desktop + Tablet
* Rinsion Internal Admin: Desktop

All laundry-facing screens must remain usable on mobile devices.

---

# **MVP User Journey Summary**

Most common laundry journey:

Login
 ↓
Search Customer
 ↓
Create Customer (if needed)
 ↓
Create Order (Admin picks branch; line items with service per line)
 ↓
SMS sent with pickup code
 ↓
Received
 ↓
Confirmed
 ↓
Processing
 ↓
Ready
 ↓
SMS sent "ready for collection"
 ↓
Record Payment
 ↓
Verify Pickup
 ↓
Collected

This journey represents the core value of Rinsion and should be optimized above all other workflows.

---

# **Internal Developer Dashboard (Rinsion Team Only)**

Separate routes under `/internal/` gated by email allowlist.

## **System Health Screen**

* API uptime indicator
* Error rate over last 1 hour / 24 hours / 7 days
* Supabase connection status
* Recent error feed (last 50 errors with stack traces)
* Background job statuses (daily subscription advancer, SMS reminders, etc.)

## **Subscriptions Screen**

* Active counts per plan (Trial / Starter / Growth)
* Trial expirations in the next 7 days
* Currently in soft_block
* Currently in hard_block
* Currently locked
* Churned this month
* Total MRR

Each row drills into the laundry's subscription history.

## **Manual Payments Queue Screen**

Laundries who have tapped "I have sent the payment". Each row:

* Laundry name
* Admin phone
* Claimed amount
* Plan being paid for
* Payment type (Cycle Renewal / Upgrade Prorate)
* Timestamp of claim
* Reference code

Actions:

* Mark Paid (confirms MoMo received and triggers subscription update)
* Reject (flags as not received)
* Note (adds an internal note)

## **SMS Health Screen**

* Total SMS sent today / this month system-wide
* Success rate
* Failed deliveries with reasons (last 100)
* Total mNotify cost so far this month (estimated)
* Laundries currently at >70% of their quota
* Alert if failure rate >5% in last 1 hour
* Alert if >10 system-wide failures in last 1 hour

## **Laundries Screen (Per-Laundry Drill-Down)**

Search by laundry name, code, or admin phone.

Per-laundry view:

* Plan
* Subscription status
* 30-day snapshot (orders, SMS, payments, employee count, last login)
* Recent activity logs
* Recent SMS history
* Recent subscription payments

## **Alerts Screen**

Active alerts:

* SMS failure spike
* Payment overdue (laundries about to enter hard_block)
* Recent signups (last 24 hours)
* System errors above threshold

---

# **End of Screen Flow & User Journey Document**
