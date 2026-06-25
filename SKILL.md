# Rinsion — Claude Code Project Skill

You are building **Rinsion**, a B2B SaaS platform for laundry businesses in Ghana. This skill defines how you must work on this project. Read it in full before doing anything substantive.

---

## Project Context

Rinsion replaces paper notebooks, receipt books, and WhatsApp coordination at small-to-medium laundries with a centralized digital platform. The product manages customer records, order intake with item × service pricing, status tracking, payment recording, SMS notifications, and per-laundry subscription billing.

The platform is multi-tenant: each laundry is an isolated tenant with its own customers, orders, employees, settings, and subscription. A separate internal admin layer (Rinsion ops team only) handles cross-tenant operations like marking manual MoMo payments as received.

Target users: laundry owners (Admin role) and counter staff (Employee role). Plus Rinsion internal staff via a hidden developer dashboard.

---

## Required Reading

Before writing any code, schema, or commit, read these five files in the project root in full:

1. `Rinsion_Business_Overview.md` — the product, pricing, lifecycle, scope
2. `Rinsion_Database_Diagram.md` — the complete ERD with every table, every constraint
3. `Rinsion_Screen_Flow_.md` — user journeys and screen-by-screen specifications
4. `Rinsion_Project_Folder_Structure.md` — folder layout, naming, code standards
5. `Rinsion_Technical_Overview.md` — architecture, tech stack, integration patterns

These docs are the source of truth. When this skill and the docs disagree, the docs win. When the docs disagree with each other, ask the user before proceeding.

Do not paraphrase or summarize the docs into a "TL;DR" and work from that. Always go back to the source.

---

## Tech Stack

* **Framework:** Next.js 14+ with App Router, TypeScript (strict mode), Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL + Auth + Row Level Security)
* **SMS:** mNotify via `lib/sms/` abstraction layer
* **Payments:** Manual MoMo at launch via `lib/payments/manual.ts`, Paystack in Month 2-3 via `lib/payments/paystack.ts` (same `PaymentProvider` interface)
* **Hosting:** Vercel (Hobby for development, Pro from first paid customer)
* **Background Jobs:** Vercel Cron (configured in `vercel.json`)

Do not introduce new major dependencies without asking. Acceptable: small utility libraries (date-fns, zod, clsx). Not acceptable without discussion: ORMs, state management libraries beyond React's built-ins, alternate UI component libraries, alternate auth solutions.

---

## Non-Negotiable Rules

Violating any of these creates technical debt that is expensive to fix later. These are absolute.

### Rule 1: UI never talks to Supabase directly

Forbidden anywhere in `app/`, `components/`, or `features/`:

```ts
const { data } = await supabase.from('orders').select('*')
```

Required pattern:

```ts
const result = await getOrders()
if (result.success) { /* use result.data */ }
```

Supabase imports are only allowed in `lib/supabase.ts` and inside files in `services/*`.

### Rule 2: Multi-tenancy enforced at every layer

Every laundry-scoped query, service function, and RLS policy must scope by `laundry_id`. No exceptions. A bug here is a data breach.

Internal admin services (`services/admin/`) are the only services allowed to cross laundry boundaries, and only after the email allowlist check passes.

### Rule 3: Row Level Security is mandatory

Every laundry-scoped table has RLS enabled with policies that filter by the requesting employee's `laundry_id` (derived from the JWT). Do not skip this even in development.

### Rule 4: UUIDs everywhere

Primary keys are UUIDs generated with `gen_random_uuid()`. No auto-increment integers.

### Rule 5: Soft delete on Orders, Customers, Item Types, Services

Use `deleted_at`. Never `DELETE FROM` on these tables. Filter `WHERE deleted_at IS NULL` in every read query.

Subscriptions and subscription_payments are NEVER soft-deleted. They are immutable financial records.

### Rule 6: Never store calculated totals

These are computed at read time, never stored:

* `customers.total_orders`
* `customers.lifetime_revenue`
* `orders.amount_paid`
* `orders.balance_due`
* `subscriptions.sms_used_in_cycle`

If a query feels slow, add an index. Do not denormalize without explicit user approval.

### Rule 7: Lock prices on order_items and plan on subscription_payments

When creating an `order_items` row, snapshot `unit_price` directly. Historical orders must not change when the pricing matrix updates.

When creating a `subscription_payments` row, snapshot `plan_at_payment`. Historical payments must not change when plan pricing updates.

### Rule 8: Audit log every significant action

Create an `activity_logs` row for: order creation, status changes, payments, customer edits, employee changes, SMS sent/failed, subscription payments, subscription status transitions, plan upgrades/downgrades, settings updates.

Pattern:

```ts
await createActivityLog({
  laundryId,
  orderId,        // null for non-order events
  employeeId,     // null for system actions
  actionType,
  description,
})
```

### Rule 9: Provider abstraction

External providers (SMS, payments) are accessed through interfaces, not direct SDK imports. mNotify SDK calls live only in `lib/sms/mnotify.ts`. Paystack SDK calls live only in `lib/payments/paystack.ts`. Services and UI call the interface methods.

---

## Build Phases

Build in this order. Do not skip ahead. Mark each phase as complete (commit, push, summarize what shipped) before starting the next.

If the user asks for something out of phase order, push back. Acceptable: "That's part of Phase 6 — we're on Phase 3. Want me to finish Phase 3 first, or pivot now?"

### Phase 1: Foundation

1. Next.js 14 project with App Router, TypeScript strict, Tailwind
2. Supabase project setup, connection in `lib/supabase.ts`
3. Full database schema from `Rinsion_Database_Diagram.md` as migration files in `supabase/migrations/`
4. RLS policies for every laundry-scoped table
5. Folder structure from `Rinsion_Project_Folder_Structure.md` (create empty folders + `.gitkeep`)
6. Stub files: `lib/logger.ts`, `lib/sms/types.ts`, `lib/sms/mnotify.ts` (returns mock success), `lib/sms/index.ts`, `lib/payments/types.ts`, `lib/payments/manual.ts`, `lib/payments/index.ts`
7. Constants files from spec: `constants/plans.ts`, `constants/statuses.ts`, `constants/subscriptionStatuses.ts`, `constants/internalAdmins.ts`
8. TypeScript types in `types/` matching the schema
9. A basic landing page that confirms the deployment works

**Verify:** Database schema deploys cleanly. RLS policies tested with two test laundries — Laundry A cannot read Laundry B data.

### Phase 2: Auth + Trial Initialization

1. Supabase Auth integration
2. Login page with email/password
3. Employee profile lookup on login (`services/auth/getCurrentEmployee.ts`)
4. Role detection (admin / employee) from `employees.role`
5. Branch context resolution (employee → assigned branch; admin → must select per-order)
6. Subscription status check on login: `locked` blocks login, `hard_block` shows read-only mode, `soft_block` shows warning banner
7. Logout flow
8. Auth middleware protecting all `/app/*` routes
9. Signup flow that creates: laundry, admin employee, trial subscription (`plan = trial`, `status = trialing`, 14-day cycle, 800 SMS quota)
10. Forgot password flow

**Verify:** Can sign up a new laundry and log in. Trial subscription auto-created. Role detection works. Two different laundries' admins see only their own data.

### Phase 3: Customer Management

1. `services/customers/` — createCustomer, getCustomer, getCustomers, updateCustomer, findCustomerByPhone
2. Phone uniqueness check (returns existing customer instead of creating duplicate)
3. Customer list page with search by name and phone
4. Create customer page
5. Customer detail page with computed total_orders and lifetime_revenue
6. Activity logging on all customer mutations

**Verify:** Cannot create two customers with the same phone in the same laundry. Computed fields show correct values.

### Phase 4: Items, Services, Pricing Matrix (Admin Only)

1. `services/items/` — createItemType, updateItemType, getItemTypes, deactivateItemType
2. `services/services/` — createService, updateService, getServices, deactivateService
3. `services/pricing/` — setPrice, getPrice, getPricingMatrix, disableCombination
4. Item Types list/add/edit/deactivate screens
5. Services list/add/edit/deactivate screens
6. Pricing Matrix screen — grid of item types × services with inline-editable prices, empty cells for combinations not offered
7. Permission gate: employees blocked from these screens at service layer

**Verify:** Admin can build a complete pricing matrix. Employee account cannot access these screens or call these services.

### Phase 5: Orders (the core product)

1. `services/orders/` — createOrder, getOrder, getOrders, updateOrder, updateStatus, cancelOrder, searchOrders
2. `utils/generatePickupCode.ts` — 5-digit numeric, random
3. `services/payments/` — recordPayment, getPayments, getOrderPayments, computeOrderBalance
4. Branch limit check on `createBranch` (Starter = 1, Growth = 3)
5. Employee limit check on `createEmployee` (Starter = 4, Growth = 9)
6. Create Order screen with admin branch selector, line items (item × service × quantity = auto-priced from matrix), notes, running total
7. Order list page
8. Order detail page with pickup code prominent, items breakdown, payment summary, current status, timeline
9. Status transition controls (Received → Confirmed → Processing → Ready → Collected, with Cancelled alternative)
10. Status history recorded in `order_status_history` on every transition
11. Record Payment flow with method selector
12. Global search (order ID, pickup code, phone, customer name)

**Verify:** Can create an order through the full lifecycle. Status history persists every transition. Payment balance computes correctly with partial payments. Pricing matrix correctly applies per line item. Plan limits actually block adding excess branches/employees.

### Phase 6: Notifications (SMS via mNotify)

1. Real implementation of `MnotifyProvider` in `lib/sms/mnotify.ts`
2. `services/notifications/sendSms.ts` — the chokepoint: quota check, failure check, send, record in `sms_messages`, set `counts_toward_cap` correctly, create activity log
3. `services/notifications/computeSmsUsage.ts` — counts cap-eligible messages in the current cycle
4. `services/notifications/countFailuresInLast24Hours.ts` — rolling 24h failure count for a laundry
5. `services/notifications/sendOrderCreatedSms.ts` — triggered on order creation, sends pickup code + order ID
6. `services/notifications/sendOrderReadySms.ts` — triggered when status moves to Ready
7. `services/notifications/resendPickupCodeSms.ts` — manual trigger from order detail
8. `services/notifications/sendQuotaWarningSms.ts` — sent at 70% usage, once per cycle, updates `sms_warning_70_sent_at`
9. `services/notifications/sendRenewalReminderSms.ts` — sent at 3 days, 1 day, day-of cycle end
10. SMS history visible on order detail screen
11. SMS usage card on admin dashboard
12. SMS usage panel in settings with breakdown

**Verify:** Order creation sends pickup code SMS. Moving to Ready sends ready SMS. SMS usage shows correctly in dashboard and settings. 70% warning fires once per cycle. Failed sends below the 5-in-24h threshold do not count toward cap; above it, they do.

### Phase 7: Subscriptions

1. `services/subscriptions/` — getActiveSubscription, startTrial (called in signup, already partially built in Phase 2), recordCycleRenewalPayment, recordUpgradePayment, computeProrateAmount, canAddBranch, canAddEmployee, canDowngrade, generatePaymentReference
2. Subscription panel in Settings showing current plan, cycle dates, days remaining, recent payments
3. Plan Comparison screen
4. Upgrade flow — calculates prorate, displays the math, shows payment instructions
5. Subscription Payment Instructions screen — MoMo number, exact amount, reference code, "I have sent the payment" button
6. The "I have sent the payment" button:
   * Logs the action
   * Adds the laundry to the internal Manual Payments Queue
   * Shows confirmation
7. Subscription Status card on admin dashboard with "Cycle ends in X days — GHS 90 to continue Starter or GHS 180 to upgrade to Growth"
8. Banner system for soft_block warning and hard_block read-only mode

**Verify:** Trial subscription auto-created on signup. Upgrade math shown correctly. "I have sent the payment" routes to the internal queue. Settings shows correct subscription state.

### Phase 8: Pickup Workflow

1. Pickup verification screen
2. Search-and-collect flow (search by order ID / pickup code / phone)
3. Pickup code verification UI
4. Mark Collected action with payment-complete check
5. Resend Pickup Code SMS button

**Verify:** Cannot mark collected if payment is incomplete (when partial payments disabled). Pickup code verification works. SMS resend triggers a new `sms_messages` row.

### Phase 9: Employees, Settings, Reports

1. Employee List (admin only) with phone visible
2. Add Employee with required phone field, branch assignment, role selector — blocked if would exceed plan limit
3. Disable Employee
4. Settings screens: Laundry Settings, Workflow toggles, Branch Management (with plan-limit blocking and "Upgrade to Growth" CTA)
5. Reports (admin only): Revenue, Orders, Employee Activity

**Verify:** Cannot add a 5th employee on Starter. Cannot add a 2nd branch on Starter. Upgrade CTA links to the upgrade flow.

### Phase 10: Background Jobs (Vercel Cron)

1. `vercel.json` with cron config for `/api/cron/advance-subscriptions` daily at midnight GMT
2. `/api/cron/advance-subscriptions/route.ts` — verifies `Authorization: Bearer ${CRON_SECRET}`, calls `services/subscriptions/advanceSubscriptionStatus.ts`
3. `advanceSubscriptionStatus.ts`:
   * Transition active → soft_block at 1+ days past cycle end
   * Transition soft_block → hard_block at 7+ days past
   * Transition hard_block → locked at 13+ days past
   * Send renewal reminders at 3 days / 1 day / day-of
   * Log every transition in `activity_logs`

**Verify:** Manually trigger the cron endpoint in dev and confirm transitions and reminders fire correctly.

### Phase 11: Internal Developer Dashboard

1. Email allowlist check in `lib/internal-admins.ts` and `services/admin/isInternalAdmin.ts`
2. Routes under `/app/internal/` gated by the allowlist
3. System Health screen — error rate, Supabase status, recent errors
4. Subscriptions screen — counts per plan, trial expirations, soft/hard/locked counts, MRR
5. Manual Payments Queue — pending payments with Mark Paid / Reject / Note actions
6. SMS Health screen — total sent, success rate, failures, laundries at >70% quota
7. Laundries drill-down — search and view per-laundry 30-day snapshot
8. Alerts screen

**Verify:** Non-allowlisted accounts get 404 on `/internal/*`. Allowlisted accounts can mark a manual payment as paid, which updates the subscription and creates an activity log entry.

### Phase 12: Polish, Testing, Deployment

1. Manual testing of all flows on two test laundries (admin + employee accounts each)
2. Mobile responsiveness check on every laundry-facing screen
3. Error handling sweep — every service returns the `{success, data}` or `{success, error}` shape
4. Deploy to Vercel
5. Set environment variables (Supabase keys, mNotify API key, `CRON_SECRET`, internal admin emails)
6. Verify cron runs in production
7. Smoke test the full create-order-to-collected flow on production

---

## What NOT to Build

These are explicitly out of scope for Product A. If a user request lands in one of these, stop and confirm before building:

* Customer-facing accounts (Product B)
* Customer OTP login (Product B)
* Customer order submissions (Product B)
* Customer order tracking (Product B)
* Loyalty programs
* WhatsApp notifications
* Thermal printer integration
* Payment collection from customers (Hubtel) — only payment **recording** in Product A
* Paystack integration — deferred to Month 2-3 after launch. The interface and `manual.ts` provider must exist from Phase 1, but the `paystack.ts` provider stays as a stub returning "not implemented"
* The `draft` order status — reserved in the enum but no UI exposes it in Product A
* Multi-branch logic beyond the 3-branch Growth limit
* Custom branding, API access, white-label features

---

## What NOT to Assume Yet (Pending Interviews)

The user is conducting laundry owner interviews. Do not lock in any of these decisions without confirmation:

* Specific SMS message wording — use sensible defaults, mark them as `TODO: confirm with user after interviews`
* Whether physical receipts are needed at drop-off — assume not, but leave the order detail screen designed in a way that adding a "Print Receipt" button later is easy
* Whether partial collection (half the order ready) is supported — assume no
* Refund / damage compensation workflow — out of scope
* Bag tracking — out of scope
* Whether Express orders need separate pricing — assume no, treat as a flag only

Build the schema and architecture flexibly enough that these can be added or tweaked after interviews without major rework.

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Tables | snake_case | `order_items`, `item_service_prices`, `subscription_payments` |
| Columns | snake_case | `created_at`, `pickup_code`, `counts_toward_cap` |
| TypeScript interfaces | PascalCase | `Customer`, `ItemServicePrice`, `Subscription` |
| Variables | camelCase | `customerName`, `prorateAmount` |
| Constants | UPPER_SNAKE_CASE | `ORDER_STATUSES`, `PLANS`, `SMS_OVERAGE_PRICE` |
| Service files | camelCase.ts | `createOrder.ts`, `computeProrateAmount.ts` |
| React components | PascalCase.tsx | `CreateOrderForm.tsx`, `SubscriptionStatusCard.tsx` |
| Routes | kebab-case folders | `app/items-and-services/`, `app/internal/manual-payments/` |

---

## Service Return Shape

Every service function returns one of these two shapes. Never throw raw errors to the UI.

```ts
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

Example:

```ts
export async function createCustomer(input: CreateCustomerInput): Promise<ServiceResult<Customer>> {
  try {
    // ... business logic
    return { success: true, data: customer }
  } catch (e) {
    logger.error('createCustomer failed', e)
    return { success: false, error: 'Unable to create customer. Please try again.' }
  }
}
```

User-facing error messages must be friendly. Technical details go to `logger.error()`, not to the response.

---

## Audit Logging Pattern

Use this pattern for every significant action. Add it before the success return.

```ts
await createActivityLog({
  laundryId,
  orderId: orderId ?? null,
  employeeId: employeeId ?? null,  // null for system actions like cron
  actionType: 'ORDER_CREATED',
  description: `Created order ${orderNumber} for ${customerName}`,
})
```

Action types are listed in `Rinsion_Database_Diagram.md` under the `activity_logs` section. Use them exactly as written.

---

## Definition of Done

A feature is complete only when every item on this list is true:

* Functionality works in development
* Input validation exists
* Permissions enforced at service layer (not just UI)
* RLS policies confirmed
* Subscription state checked (writes blocked in `hard_block` / `locked`)
* Activity log entry created for significant mutations
* Mobile responsive on common phone sizes (390px width minimum)
* Error handling returns the `ServiceResult` shape
* TypeScript types added for all new entities
* No direct Supabase calls in UI or component files
* No direct provider SDK calls in services or UI
* Manually tested with at least two laundry accounts

---

## When Uncertain

Decision tree:

1. **Did the docs cover this?** Re-read the relevant section. The five reference docs are deliberately comprehensive.

2. **Is it a product, UX, or business decision the docs don't cover?** → STOP. Ask the user. Do not invent product behavior.

   Examples that require asking: "What should the SMS message say exactly?" "What happens if a customer tries to collect without paying?" "Should we add a discount field?"

3. **Is it a technical implementation detail with multiple reasonable options?** → Pick the simplest one, note it in the commit message, and proceed.

   Examples you can decide: which date library to use, how to structure a sub-component, naming for an internal helper function, which Tailwind utilities to combine.

4. **Is it a deviation from the architecture rules?** → Never. The non-negotiable rules above are not optional. If you think a rule needs to be broken, ask first and explain why.

---

## Engineering Principle

Every feature in Rinsion must reduce at least one of:

* Lost Orders
* Lost Items
* Lost Payments
* Lost Customers
* Employee Time

If a feature doesn't contribute to one of these, push back on building it. This applies to the user's requests too: if the user asks for something that doesn't pass this filter, ask "which of the five does this reduce?" before building.

---

## Documentation Standards

Code must be self-explanatory. A future Mansur returning to a file should understand what it does without re-reading the five reference docs.

### File Header Comments

Every TypeScript/TSX file starts with a brief header explaining its purpose and pointing to relevant spec sections when applicable.

```ts
/**
 * services/orders/createOrder.ts
 *
 * Creates a new order, persists order_items with locked unit prices,
 * generates a 5-digit pickup code, triggers the order-created SMS,
 * and writes an activity log entry.
 *
 * Spec references:
 * - Rinsion_Screen_Flow_.md → "Create Order Screen"
 * - Rinsion_Database_Diagram.md → "Lock Prices on Order Items"
 */
```

```tsx
/**
 * CreateOrderForm.tsx
 *
 * Order creation form. Admin-only branch selector + customer search +
 * line items (item × service × quantity) + notes + running total.
 * Calls services/orders/createOrder on submit.
 */
```

### JSDoc on Exported Functions

Every exported service function gets a JSDoc block describing what it does, its parameters, and what it returns. Include any non-obvious business rules in the description.

```ts
/**
 * Creates a customer in the given laundry.
 *
 * Phone uniqueness is enforced per laundry. If a customer with the same
 * phone already exists, this returns that existing customer rather than
 * creating a duplicate — matching the spec rule that shared phones mean
 * shared customer records.
 *
 * Writes an activity log entry on creation.
 *
 * @param input - Customer fields (firstName, lastName, phone)
 * @returns The created customer, or the existing one if phone collision
 */
export async function createCustomer(...): Promise<ServiceResult<Customer>> {
  // ...
}
```

### Inline Comments for Business Logic

When code implements a specific spec rule, cite it inline. This makes the code traceable back to the source of truth.

```ts
// Phone uniqueness rule — Rinsion_Business_Overview.md → Customer Records:
// "If two people share a phone, they share a customer record."
const existing = await findCustomerByPhone(laundryId, phone)
if (existing) return { success: true, data: existing }
```

```ts
// Failure counting rule — Rinsion_Technical_Overview.md → Notifications:
// Failures count toward the cap only when ≥5 failures in rolling 24h.
const recentFailures = await countFailuresInLast24Hours(laundryId)
const countsTowardCap = sendResult.success || recentFailures >= 5
```

```ts
// Prorate math — Rinsion_Business_Overview.md → Plan Changes:
// days_remaining × (new_daily_rate - current_daily_rate)
const prorateAmount = daysRemaining * (PLANS.growth.dailyRate - PLANS.starter.dailyRate)
```

### Per-Folder READMEs

Each major folder gets a README.md explaining the domain:

```
services/orders/README.md
services/customers/README.md
services/notifications/README.md
services/subscriptions/README.md
services/admin/README.md
features/orders/README.md
lib/sms/README.md
lib/payments/README.md
```

Each README covers:
- What this domain owns (one paragraph)
- The key entities (with links to the type files)
- Common flows (e.g., "to create an order, call `createOrder` which internally calls `generatePickupCode` and `sendOrderCreatedSms`")
- Where related code lives (UI in features/, types in types/, etc.)

### Project README

The root `README.md` is the entry point. Keep it short but complete:

- What Rinsion is (one paragraph)
- How to run locally (env vars, supabase setup, mNotify key, npm install, npm run dev)
- The five reference docs and what each covers
- The current phase and what's been shipped
- How to deploy
- Known issues / TODOs

Update it whenever a phase completes.

### Phase Completion Summaries

When a phase finishes, create `docs/phases/0X-phase-name.md` documenting:

- What was built (list of files, screens, services)
- Key decisions made and why
- Anything that deviates from the spec (and why)
- What was deferred to later phases
- Things to verify before the next phase

Example path: `docs/phases/03-customer-management.md`

These build a project history. They also help when you come back after a few days.

---

## Working Style

You are working with a solo builder who wants to learn as the project comes together. Narrate your work. Explain the "why" of non-obvious choices. Don't go silent and produce a code dump at the end.

### Before Starting Work

Always state what you're about to do and why, in plain language. Example:

> Starting Phase 3 — Customer Management. I'll build it in this order: (1) the service functions in `services/customers/` because everything else depends on them, (2) the customer list page (read-heavy, easier to verify the services work), (3) the create customer page (introduces the phone-uniqueness logic), (4) the detail page (introduces the computed total_orders and lifetime_revenue). The trickiest piece is phone uniqueness — when someone tries to create a customer with a phone that already exists in the same laundry, we return the existing customer rather than failing. This matches the spec rule that shared phones mean shared records.

This kind of preamble takes 30 seconds to read but saves 10 minutes of "wait, why is it doing that?" later.

### While Working

When making a non-trivial choice, briefly explain the tradeoff. Examples:

> Using `react-hook-form` for this form instead of plain `useState`. We have nested arrays (line items) and managing that with plain state would be painful. The library adds ~25kb but no architectural complexity. Pushing back if you'd rather keep state vanilla.

> Picking Server Components for the customer list page since it's pure read with no client-side interactivity beyond the search box. Search will be a small Client Component island. This keeps the bundle smaller and matches how Next.js App Router wants you to use it.

When following a spec rule, cite it briefly:

> Locking `unit_price` on `order_items` per Rinsion_Database_Diagram.md → Implementation Notes → "Lock Prices on Order Items".

When you encounter something the spec doesn't cover, stop and ask:

> The spec doesn't say what happens if an admin tries to delete a customer who has active orders. Two options: (a) block the delete and show "Customer has active orders", (b) allow the delete and orphan the orders (still visible by order ID). Recommend (a) — orphaning data violates the audit principle. Confirm?

### After Completing Work

Summarize what shipped and what's left. Don't just say "done." Example:

> Phase 3 complete. Shipped:
> - 5 customer services: `createCustomer`, `getCustomer`, `getCustomers`, `updateCustomer`, `findCustomerByPhone`
> - Customer list page (`/customers`) with search by name and phone
> - Create customer page with duplicate detection
> - Customer detail page with computed `total_orders` and `lifetime_revenue`
> - Activity logs on all mutations
>
> Key decisions:
> - Used the existing `SearchInput` component from Phase 1 (no need to rebuild)
> - Stripped phone input to digits-only, stored in E.164 format
>
> Verified:
> - Created two customers with the same phone in the same laundry — the second attempt correctly returned the first customer
> - Verified Laundry A admin cannot see Laundry B customers (RLS working)
>
> Ready for Phase 4 when you say go.

Then wait for "next phase" before continuing.

### When Asking Questions

Present options with a recommendation. Open-ended "what do you want?" wastes the user's time. Frame every question as a tradeoff with a recommended choice and explain it. Example:

> Two options for SMS template storage:
> (a) Store templates in the database so admins can edit them later — more flexible, but adds a new table, an admin UI, and version handling.
> (b) Hardcode templates in `constants/smsTemplates.ts` — simpler, requires a code change to update.
>
> Recommend (b). Interviews haven't surfaced demand for admin-editable templates, and the system messages we send (pickup code, order ready) are short and rarely need to change. We can migrate to (a) later if real demand appears. Confirm?

### When Stuck

If you've been on a problem for 15+ minutes without progress, stop and summarize. Don't keep grinding silently:

> Stuck on RLS + cron auth for 20 minutes. The cron route runs without a user session, so the default RLS policy (`laundry_id = current employee's laundry_id`) blocks all reads. Two paths:
> (a) Use the Supabase `service_role` key inside the cron route — bypasses RLS, requires careful scoping inside the function.
> (b) Create a "system" employee per laundry and inject its JWT during cron.
> Recommend (a) — `service_role` is the standard pattern for admin/cron contexts and (b) adds dummy data to `employees`. Confirm?

### Git Hygiene

- Commit after every meaningful unit of work. Small, focused commits beat one huge "feat: phase 3 done" commit.
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- Branch naming: `feature/customers`, `feature/sms-quota-warnings`, `fix/pickup-code-collision`, `refactor/order-service`
- One branch per phase, merged to main when the phase is verified

### Pushing Back

- If a user request would violate the non-negotiable rules above, push back. Do not silently work around the rules.
- If you find inconsistencies between the five reference docs, flag them and ask the user before resolving.
- If the user's request doesn't pass the "reduces one of the 5 losses" filter, ask which one before building.
- If you think a spec choice is wrong, say so once with reasoning. If the user reaffirms it, build it the way they decided.

You are the implementation partner, not an order-taker. Push back when something looks wrong. Suggest improvements. Flag risks. But also: when the user has decided, build what they decided.
