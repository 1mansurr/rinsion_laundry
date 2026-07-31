# Rider Company Platform — Vision & Build Plan

Status as of this doc: schema written (not applied to prod), auth/invite
foundation and provisioning service written. Nothing pushed to the shared
database yet. Everything below is what's agreed so far and what's left.

## Why this exists

The original spec (`docs/customer-portal+rider.md`) assumed Rinsion would
integrate with an existing ride-hailing/courier company's own API. That
assumption doesn't hold in practice — there's no such API to plug into yet,
and building one would require a business partnership that doesn't exist.

The revised vision: **Rinsion hosts the rider company itself.** A rider
company gets its own dashboard inside Rinsion, invites and manages its own
riders, and works the pickup/delivery job queue that laundries approve into
existence. This sidesteps the "need a partner API" blocker entirely and
turns logistics into something fully under your control.

The existing `LogisticsProvider` abstraction (`src/lib/logistics/`) already
anticipated swapping in a different backend later — this plan adds a new
implementation of that same interface rather than changing how orders/
laundries interact with it.

## Decisions locked in so far

1. **One rider company at launch.** `rider_companies` is a real table (so a
   second company later is just another row), but no matching, discovery, or
   company-selection logic is built this phase. Every laundry's approved
   pickup/delivery routes to the one active company.
2. **You provision the rider company manually**, same pattern as
   `/internal/provision` for laundries — no self-serve signup.
3. **Riders get real Rinsion accounts** (not just a roster staff manage by
   hand) — because otherwise notifying them would either cost SMS (drawing on
   a laundry's own quota for something that isn't laundry business) or
   require phone calls. Each rider logs in and sees their own jobs.
4. **Two independent status trails per job**, not one:
   - The existing laundry/shop-side status (`logistics_requests.status`) —
     unchanged, staff still click "Mark picked up" when clothes physically
     arrive at the shop.
   - A new rider-side status (`logistics_requests.rider_status`) — the
     rider's own progress, written from their own view: `assigned` → `en_route`
     → `picked_up` → `dropped_off`. Symmetric for both legs: for a pickup,
     `picked_up` = collected from the customer, `dropped_off` = handed to the
     laundry. For a delivery, `picked_up` = collected from the laundry,
     `dropped_off` = handed to the customer.
   - Rationale: a rider physically collecting laundry from a customer, and
     the laundry physically receiving it at the shop, are two different
     real-world moments with two different people confirming them.
5. **Customer PII reveal is staged**: a rider sees only the pickup/delivery
   **location** before they accept a job. Once `assigned_rider_id` is set to
   them, the customer's name and phone become visible.
6. **In-app notifications only, no SMS**, via a Supabase Realtime
   subscription on a new `rider_notifications` table. This only fires while
   the rider has the page/app open. True OS-level push (phone alerts with
   the app closed) needs either a PWA or a native app — **you've decided to
   build the native app**, so real push is deferred to that phase. This
   phase is website-only.
7. **Bulk status updates**: a rider's "My Jobs" view needs multi-select +
   one action to move several jobs to the same status at once — e.g.
   arriving at the laundry with three pickups and marking all three
   "dropped off" in one tap, instead of one at a time.
8. **Invite delivery has no SMS either.** The very first time a rider (or a
   rider company's first admin) is invited, they have no account yet, so
   nothing can be in-app. Rinsion generates the invite link;
   the inviting admin (rider-company admin, or you for the company's first
   admin) copies and forwards it themselves (WhatsApp/text/in person) — no
   Rinsion-billed SMS involved at any point in this flow.
9. **Scope for now: website only.** The native mobile app (Android first,
   with laundry-admin offline support + sync) is a separate plan, to be
   discussed and built after this is live.

## Data model (written, not yet applied to the database)

New tables, mirroring how laundries/employees already work in this codebase:

- **`rider_companies`** — `id, name, phone, is_active`. One row today.
- **`riders`** — `id, auth_user_id, rider_company_id, role (admin|rider),
  first_name, last_name, phone, is_active, deleted_at`. One table for both
  the company's own dashboard admin and its field riders — same trick as
  `employees.role` for laundries. `phone` is encrypted at rest, same
  convention as `employees.phone`.
- **`rider_invites`** — same shape as the existing `pending_invites` table
  (token hash, phone, role, expiry, accepted_at), kept separate because the
  role type and tenant space differ.
- **`rider_notifications`** — `id, rider_id, logistics_request_id, message,
  read_at`. Powers the in-app live badge via Supabase Realtime.
- **`logistics_requests`** (existing table, extended) — adds
  `rider_company_id`, `assigned_rider_id`, `rider_status`.

RLS mirrors the existing `get_my_laundry_id()` pattern: new
`get_my_rider_company_id()` / `get_my_rider_id()` / `get_my_rider_role()`
functions, tenant-scoped policies on the new tables, and a rider-side read
policy added to `logistics_requests`. PII staging (location-only vs full
contact) is NOT done via RLS — it's a query-shape decision in the service
layer, since it depends on whether `assigned_rider_id` is the caller.

Migration file: `supabase/migrations/20240040000000_rider_company_platform.sql`
— written and reviewed for syntax/naming collisions, but **not applied to
the local or production database yet**. The sandbox this session runs in has
no network access, so `supabase start` couldn't be used to verify it against
a real Postgres — that verification still needs to happen (locally, with
network access) before anyone runs `supabase db push` against the shared
prod database.

## What's built so far (code, not yet wired into any UI)

- `src/constants/statuses.ts` — `RIDER_ROLES`, `RIDER_ROLE`,
  `RIDER_JOB_STATUSES`.
- `src/services/riders/getMyRiderProfile.ts` — mirrors `getMyProfile.ts`.
- `src/lib/auth.ts` — added `requireRiderRole`, mirrors `requireRole`.
- `src/services/riders/createRiderInvite.ts` — mirrors `createInvite.ts`;
  links an existing auth account directly if the phone already has one
  (employee, customer, or rider elsewhere), otherwise issues a token. No SMS.
- `src/services/riders/acceptRiderInvite.ts` — mirrors `acceptInvite.ts`;
  creates the auth user + riders row from a valid token, auto-signs in.
- `src/services/platform/provisionRiderCompany.ts` — mirrors
  `provisionLaundry.ts`; platform-admin-gated, creates the `rider_companies`
  row, invites the first admin, returns the invite link for you to forward
  (no SMS sent).

All on the `testing` branch, committed. Nothing has touched the shared
production database.

## What's left to build

1. **Rider login route group** (`/rider/login`, invite-accept page at
   `/ri/[token]` mirroring the existing `/i/[token]`), plus a middleware
   block for the `/rider` prefix (mirrors how `/portal` is handled today).
2. **Rider company admin dashboard** — roster (list riders, invite button),
   job queue (pending pickup/delivery jobs routed to this company, accept +
   assign to a specific rider).
3. **Rider's own job view** — "My Jobs" list scoped to jobs assigned to them
   (location-only until accepted, full contact after), status actions
   (en route / picked up / dropped off), multi-select bulk update, and the
   realtime notification badge.
4. **`RinsionRiderNetworkProvider`** — a new `LogisticsProvider`
   implementation backed by the real tables above, replacing the current
   no-op `ManualLogisticsProvider` in `src/lib/logistics/index.ts`. No change
   needed to order/approval logic — that's the point of the existing
   abstraction.
5. **The delivery leg** — the "Request Delivery" button/flow for `ready`
   orders doesn't exist at all yet (only pickup was built in the earlier
   customer-portal phase). This reuses the same job/assignment mechanics as
   pickup once built.
6. **A small internal UI** at `/internal/provision-rider-company` so you can
   actually call `provisionRiderCompany` from a form instead of a script —
   not yet built, mirrors `/internal/provision`.
7. **Local migration verification + prod push** — needs to happen with your
   go-ahead, since it's the one genuinely irreversible step in this whole
   plan (shared prod DB, no staging Supabase).

## Open items / things worth double-checking against your intent

- The rider view is deliberately being built as plain responsive web (no PWA
  install prompt, no service worker) so it ships without depending on the
  native app decision. When the native app conversation happens, this is the
  screen set that gets ported/rebuilt there.
- `rider_companies.phone` and the admin invite phone are two different
  things (company contact number vs. the specific person being invited as
  first admin) — worth confirming that's the right shape when you review the
  provisioning form.
- No commission/payment handling of any kind is in this plan — riders are
  assumed to be paid by their own company outside Rinsion entirely. Flag if
  that's wrong.
