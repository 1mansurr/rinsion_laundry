# Rinsion — Auth, Invites & Provisioning

## Build spec · v1 · for Claude Code

**Scope:** phone-first auth, phone-based employee invites, branch removal from UI, and the internal platform provisioning dashboard with pricing pre-fill.

**Slots into:** `docs/` alongside the existing reference docs. Build in the order below — each workstream depends on the one before it.

---

## 0. Build order & dependencies

1. **Phone-first auth** — foundation; everything else assumes a phone identity.
2. **Branch removal from UI** — do before invites/orders so their signatures lose `branchId`.
3. **Employee invites (phone + SMS link)** — depends on (1).
4. **Platform provisioning dashboard** — reuses the invite primitive from (3).
5. **Templates & pricing pre-fill** — consumed by (4).

Each carries its own verification gate (§9). Nothing ships until its gate passes.

---

## 1. Phone-first authentication

Phone is the default login identity; email is an optional second identity on the **same** auth user. Supabase treats phone and email as two identities that can coexist, so "email optional" costs almost nothing.

### Data
- No schema change. `auth.users` already holds phone.
- `employees` unchanged.

### Service (`services/auth/`)
- `signIn({ phone, password })` and `signIn({ email, password })` — one function, either identity. Delegates to `supabase.auth.signInWithPassword`.
- Server-side user creation is done during `acceptInvite` (§3), not here: `supabase.auth.admin.createUser({ phone, password, phone_confirm: true })`. `phone_confirm: true` skips OTP — the invite link already proved possession of the phone.
- **No Supabase SMS provider config needed.** OTP is bypassed; mNotify carries the invite; Supabase only does phone+password. Confirm the client signatures at build (stable API, worth a check).

### UI
- Login screen defaults to **phone + password**, with a toggle to **email + password**.
- Keep the existing forgot-password path; email (when present) becomes the recovery channel later with no further change.

---

## 2. Branch removal from UI (schema intact)

Strip branch from the **UI only**. The schema, invariants, and FKs stay exactly as they are.

### Data
- **No change.** `orders.branch_id` and `employees.branch_id` stay `NOT NULL`. `branches` table stays. This avoids ever backfilling a `NOT NULL` FK onto populated tables when multi-branch returns.

### Service
- New helper `services/branches/getSoleBranchId.ts` → returns the laundry's single branch id.
- `createOrder` drops `branchId` from its input; resolves it via `getSoleBranchId(laundryId)` server-side and writes it as before.
- Invite/accept (§3) resolve `branch_id` the same way at acceptance.

### UI
- Remove `BranchSelector` from the create-order flow.
- Remove branch column/field from employee list and add-employee screens.
- The branch parameter disappears from every UI surface and lives entirely in the service layer. When multi-branch returns, switch the UI back on — the data has been consistent the whole time.

---

## 3. Employee invites (phone, SMS link)

Admin supplies only what must stay privileged; the employee supplies their own identity fields on a web page reached by the SMS link.

- **Admin enters:** phone + role.
- **Employee enters on accept:** first name, last name, password.
- Role stays with the admin (privilege escalation risk). Branch is auto-resolved (§2), so it never appears.

### Data — new table `pending_invites`
```
id            uuid pk
laundry_id    uuid fk
phone         text
role          text            -- 'admin' | 'employee'
token_hash    text            -- SHA-256 of the raw token; never store the raw value
expires_at    timestamptz     -- e.g. now() + 7 days
accepted_at   timestamptz     -- null = pending
created_by    uuid            -- employees.id (tenant path) or platform_admins.id (platform path)
created_at    timestamptz
```
- Store a **hash** of the token, not the raw value — a DB leak must not hand out live invites (same reasoning as passwords).
- No `branch_id` column for now; resolve the sole branch at acceptance. Add the column when multi-branch returns and the admin picks a branch at invite time.
- RLS: tenant-scoped by `laundry_id` like every other table.

### Service (`services/employees/`)
- **`createInvite(laundryId, phone, role, createdBy)`** — *internal, not UI-exported, not self-gating.* The caller gates it. Logic:
  1. If the phone already maps to an auth user → skip the token entirely, create the `employees` row linked to that existing `auth_user_id`, stamp active, done. (This is the "already has an account" ergonomic win, phone-keyed.)
  2. Otherwise → generate token, insert `pending_invites`, return the raw token for the SMS.
- **`inviteEmployee({ phone, role })`** — tenant entry point. `requireRole('admin')`, laundry from `getMyProfile()`, then `createInvite(...)`. Log `EMPLOYEE_INVITED`. SMS sent **after** commit (deferred-SMS pattern).
- **`acceptInvite({ token, firstName, lastName, password })`** — **public / unauthenticated** (invitee has no session; possession of the token is the authorization). Server-side with service role (creating auth users requires admin). Logic: hash token → look up by `token_hash` → reject if expired or already accepted → `admin.createUser({ phone, password, phone_confirm: true })` → insert `employees` row (name, role, `auth_user_id`, resolved `branch_id`) → stamp `accepted_at`. Single-use. Log `EMPLOYEE_ACCEPTED`. Optionally auto-sign-in and redirect to dashboard.
- **`resendInvite(inviteId)`** — new token, invalidate the old row. Rate-limit invites per admin.
- **`getPendingInvites()`** — for the list view.

### UI
- "Add Employee" collapses to **phone + role**.
- Employee list shows pending invites as **"Invited"** with a **Resend** action.
- Public accept page at `/i/[token]`: first name, last name, password → `acceptInvite`.

---

## 4. Platform provisioning dashboard

One idea: **create a working laundry, hand it to its owner.** Its danger is that it operates *across* tenants, violating the "every query scoped to `laundry_id`" rule — so it is quarantined, not bolted onto the admin app.

### Data — new table `platform_admins`
```
id            uuid pk
auth_user_id  uuid
created_at    timestamptz
```
- **RLS enabled, zero policies** → only the service role can read it.
- Platform admins are **not** `employees` rows. Free safety property: if a platform admin hits the tenant app, the "fetch employee profile" step returns nothing and bounces them — they belong to no laundry.

### The cross-tenant rule (the crux)
- RLS stays dumb everywhere: *scope to my laundry, full stop.* The platform path never appears in tenant policies.
- **Do not** add `USING (laundry_id = mine OR is_platform_admin(uid))` — that puts leak risk inside the exact rules protecting isolation.
- Every cross-tenant write goes through the **service-role client**, server-side only, living **exclusively in `services/platform/`**. That folder is the single auditable place the service role crosses laundries.

### Service (`services/platform/`)
- **`provisionLaundry({ name, ownerPhone, templateKey, prices })`** — one Postgres transaction (RPC, matching your `createOrder` pattern):
  1. insert laundry (generate `RNSN-001`)
  2. insert its single branch (`RNSN-001-01`)
  3. insert settings defaults
  4. seed item types + services from the template
  5. seed `item_service_prices` from the (edited) `prices` matrix
  6. create the owner invite via `createInvite(laundryId, ownerPhone, 'admin', platformAdminId)`

  Commit. **Then**, post-commit, fire the handover SMS. Log `LAUNDRY_PROVISIONED`.
- **`listLaundries()`** — cross-tenant: name, `laundry_code`, admin status (pending/accepted), trial state.
- **`getLaundryDetail(laundryId)`** — read + lifecycle actions.
- **`resendOwnerInvite(laundryId)`**, **`setTrial / convertTrial / extendTrial`**, **`suspendLaundry / reactivateLaundry`**.

### Keep the write surface tiny
- The tool writes almost entirely **at creation**. After handover the admin owns their data.
- Support work is **read + lifecycle** (suspend, extend trial, resend invite) — **not** editing tenant prices or orders. Every such write would bypass the tenant's audit trail and RLS scope.
- If a tenant needs a genuine data fix, do it through *their* admin account so it stays audited — not from above.
- This is also the natural home for the subscription/trial state your daily cron advances: set trial on provision, convert/extend here. Lifecycle, never content.

### UI — `/platform` route group
- Own auth gate, checked against `platform_admins` server-side. Never the anon key.
- Screens: **Laundries list** → **Provision** (name, owner phone, template picker, editable pricing matrix) → **Laundry detail** (resend invite, trial actions, suspend/reactivate).
- A separate Vercel deploy is the hardening step for later; a separate route group is enough for now. A bug here leaks *every* tenant at once, so keep it minimal and server-side only.

---

## 5. Templates & pricing pre-fill

Pricing is the main reason to pre-configure, and you usually know the laundry's real prices — so the template is a **starting matrix you edit at provision time**, not a fixed one.

### Model
- Templates as **code constants** (`services/platform/templates.ts`) for v1 — defer DB-stored templates until you actually need them.
- Two starters: **general laundry** and **dry cleaner**. Each defines its item types, services, and a full pricing matrix with real placeholder prices.

### Provision flow
1. Platform admin picks a template → the provision screen renders the item × service matrix **pre-filled** with the template's prices.
2. Admin edits cells to this laundry's actual prices.
3. Submit → the edited matrix is what `provisionLaundry` seeds into `item_service_prices`.

Placeholder values should read as real GHS prices (you usually know them), and "review your prices" is still the first thing the owner sees after accepting.

---

## 6. SMS rules (invite body)

The link's value isn't fewer token characters — it's that setting the password happens on a **page**, so the SMS carries no instructions. That is what keeps it short.

1. **Short domain + path:** `https://rinsion.app/i/TOKEN`. Drop `www`.
2. **Token:** 16 random bytes → base64url (~22 chars). All base64url characters are single-char GSM-7.
3. **Stay entirely in GSM-7.** One non-GSM-7 character flips the whole message to UCS-2 and the budget drops 160 → 70. Watch the laundry name and body: curly apostrophes, emoji, and the cedi sign **₵** are all non-GSM-7. Keep names/copy ASCII; write **"GHS"**, never ₵.
4. **Body names the laundry** (shared `Rinsion` sender ID). Target one segment:
   `Sunrise Laundry added you as staff on Rinsion. Set your password: https://rinsion.app/i/xxxx` (~110 GSM-7 chars).
5. **Links are for actions, not data.** The invite is an action on a page → link is correct. The **pickup-code SMS is unchanged and must keep the code in plain body text** — the customer reads it back at the counter, possibly on a feature phone with no data. Never hide it behind a link.

---

## 7. Security invariants (non-negotiable)

1. Service-role client appears **only** in `services/platform/`, server-side. Never the anon key there.
2. Tenant RLS stays scoped to `laundry_id` with **no platform escape hatch** in any policy.
3. `platform_admins` and `pending_invites.token_hash`: RLS-locked; raw tokens never stored.
4. Role is set by the inviter, never the invitee. `acceptInvite` reads role from the invite row, not from user input.
5. `acceptInvite` is the one public, session-less write — it must validate `token_hash`, expiry, and single-use before creating anything.
6. `orders.branch_id` / `employees.branch_id` stay `NOT NULL`; service auto-resolves.

---

## 8. Activity log events

Add: `EMPLOYEE_INVITED`, `EMPLOYEE_ACCEPTED`, `INVITE_RESENT`, `LAUNDRY_PROVISIONED`, `TRIAL_UPDATED`, `LAUNDRY_SUSPENDED`, `LAUNDRY_REACTIVATED`. Platform events log the acting `platform_admins.id`; tenant events log `employees.id` as today.

---

## 9. Verification gates

Standard gate per workstream: `tsc --noEmit`, `next lint`, `next build` all pass; service-layer only; permissions enforced; activity logs written; mobile responsive; manual test.

**Manual runtime verification required (cannot be caught by build):**
1. **`provisionLaundry` transaction RPC** — confirm full rollback if any step fails (no orphaned laundry/branch/prices).
2. **`platform_admins` and `pending_invites` RLS** — confirm a tenant admin cannot read either table, and a platform admin cannot read tenant data through the tenant app.
3. **Deferred SMS** — confirm invite/handover SMS fires only *after* commit, never inside the transaction.
4. **GSM-7 / one-segment** — send a real invite through mNotify and confirm single-segment delivery with a realistic laundry name.