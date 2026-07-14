# Permanent Deletion & Retention — Plan (read-only, not built)

**Revision 4.**

## Changelog vs Revision 3 — read this before the rest

Rev 3 left one item explicitly open (§9 item 0): what triggers `anonymize_customer_tx`/`anonymize_employee_tx`. That's now a resolved product decision, **not** the system-triggered-only default Rev 3 assumed:

- **Two triggers share the same RPC pair.** (1) The scheduled retention-timer purge, unchanged from Rev 2/3, still gated on the TBD retention numbers. (2) A new **on-request erasure** path — platform-admin- or service-role-invoked only, explicitly **not** gated on retention numbers, satisfying Act 843's erasure right on demand rather than waiting for a timer.
- **No tenant-facing self-serve "erase now" action is being built.** Deferred, by explicit instruction. The Recycle Bin still only offers Restore; nothing changes there.
- Full design in the new subsections under §4 below.

**Revision 3 header (superseded by the above):** Drafted against the live schema as of `20240021000000_tighten_table_grants.sql` (migrations 001–021) plus current `src/services/**` and `src/lib/crypto/fieldEncryption.ts`. Still a design document only — no anonymize/purge migration, RPC, or service code has been written (`20240021000000` itself is a real, applied migration, but it predates and doesn't implement anything from this plan — see changelog below). Retention windows remain **TBD** placeholders; everything else is concrete and traceable to specific files/lines.

## Changelog vs Revision 2 — read this before the rest

A new migration, `20240021000000_tighten_table_grants.sql`, landed independently of this plan (audited and applied 2026-07-13) and changes the trust model this plan's RPCs must run under. It REVOKEs the unrevoked Supabase-default `DELETE` grant from `anon`/`authenticated` on almost every table — including every table this plan marked HARD-DELETE (`activity_logs`, `join_requests`, `order_notes`, `pending_invites`, `pending_payments`, `sms_messages`) and, notably, `customers`/`employees` themselves. It also REVOKEs `UPDATE` on `payments` and `INSERT`/`UPDATE` on `subscription_payments` from both roles. Its own header comment states explicitly: *"No purge/anonymize RPCs exist yet anywhere in this codebase as of this migration; when added, they should run as SECURITY DEFINER under service_role... not rely on these authenticated/anon grants."*

This forces two corrections to Revision 2, both flagged in place below rather than silently changed:

1. **§4's RPCs move from `SECURITY INVOKER` (called by an authenticated tenant session, RLS-scoped) to `SECURITY DEFINER` under `service_role`** (matching `provision_laundry_tx`'s pattern, not `create_order_tx`'s). This isn't optional now — `authenticated` has lost `DELETE` on the very tables the immediate-scrub logic touches, and Rev 2's framing of the RPCs as "called via `supabase.rpc(...)` from an authenticated admin session" assumed a trust model this migration has closed off. Since `service_role` bypasses RLS entirely, tenant-scoping and role authorization must now happen explicitly in the TS layer *before* the RPC is invoked, not implicitly via `tenant_isolation` policies — see §4.
2. **§8's scheduled purge job can no longer optionally run as an authenticated-session cron** — that was always going to need `service_role` in practice, but Rev 2 left it as "pg_cron if available, otherwise an external cron hitting a service-role-authenticated route." With `DELETE` now revoked from `authenticated` on every purge target, only `service_role` (or a superuser-context `pg_cron` job, which itself runs outside the `anon`/`authenticated` grant surface) can perform the purge at all — this is now a hard constraint, not a design preference.

Also worth noting as independent validation, not a correction: this migration's own audit — done without reference to this plan — landed on the same table classifications this plan derived independently. `payments`/`subscription_payments` losing `UPDATE`/`INSERT` from `anon`/`authenticated` matches this plan's NEVER-TOUCH verdict; `customers`/`employees` losing `DELETE` matches this plan's ANONYMISE-IN-PLACE verdict (a hard delete was never going to be legitimate there, and now it's blocked at the privilege layer too, not just by convention). One net-new fact from its audit worth folding in: `order_item_pieces` (a per-kg order line's contents-breakdown table, not previously in this plan's scope) has a legitimate authenticated-role hard-delete path (`setOrderItemPieces.ts:52-56`, delete-then-reinsert) and holds no PII — noted here for completeness, out of scope for the rest of this document.

## Changelog vs Revision 1

Six decisions came in that change or sharpen parts of the original doc. Flagging each explicitly rather than silently overwriting:

1. **Customer/employee anonymization is no longer symmetric.** Rev 1 gave both a fixed generic placeholder (`'Deleted'`/`'Customer'` vs `'Deleted'`/`'Employee'`). Employees now get a **stable, per-row, distinguishing label** instead, because downstream financial/audit attribution needs to tell two different former employees apart. See §4.
2. **`anonymize_*` no longer defers all log cleanup to the scheduled purge.** Rev 1 said (§1 point 3, §5, §6) that anonymizing a customer/employee "does nothing" for `sms_messages`/`activity_logs` until the cron runs. That statement is **superseded**: both RPCs now perform an immediate, subject-scoped scrub of `sms_messages` and (for employees) `activity_logs` in the same operation. The scheduled purge still exists, but now for a different reason — bulk/general retention of rows regardless of whether anyone was ever anonymized — not as the only mechanism for erasure. See §5.
3. **Correction, not a policy change:** Rev 1's §0.2 described the `join_requests` plaintext gap as "`createLaundrySelfServe.ts` encrypts before insert, but `joinLaundry.ts` doesn't," implying two paths into the same table. On re-reading `createLaundrySelfServe.ts` in full, that's not quite right — it inserts encrypted PII into **`employees`** directly (self-serve signup creates the admin's employee row, never touches `join_requests`). The actual gap is narrower but still real: `join_requests` (written only by `joinLaundry.ts`'s `submitJoinRequest()`) is **always plaintext**, full stop, while the `employees` row it eventually feeds (via `approveJoinRequest.ts`) is always ciphertext. Fixed framing in §6.
4. **`order_notes` is reclassified** from "NEVER-TOUCH, manual redaction only" to **SCRUB-ON-ERASURE**, now handled by the same in-RPC mechanism as `activity_logs`, scoped by `order_id`. See §3.
5. **The `auth.users` neutralization failure mode is now treated as unacceptable-if-silent**, not a "cleanup nicety." Rev 1's §4 said a failed `admin.auth.admin.deleteUser()` call could be logged and left alone. That stance is **tightened**: a durable retry queue now makes the pending deletion recoverable rather than best-effort-and-forget. See §7.
6. Every call site that writes a name/phone/email into `activity_logs.description` is now individually inventoried and given a conversion verdict, not just listed. See §2.

---

## 0. Load-bearing facts (unchanged from Rev 1, still true)

1. **Zero `ON DELETE` clauses exist anywhere in the schema** (confirmed by grep across all 20 migrations). Every FK defaults to `RESTRICT`/`NO ACTION`. Nothing cascades.
2. `FIELD_ENCRYPTION_KEY`/`BLIND_INDEX_KEY` live in server env vars, not in Postgres — a plpgsql function cannot compute `encryptField()`/`computeBlindIndex()` itself. Every ciphertext value an RPC writes must arrive as a pre-computed parameter from the TypeScript service layer, exactly like `create_order_tx`/`record_payment_tx`/`provision_laundry_tx` already do.
3. `customers.first_name`/`last_name` and `employees.first_name`/`last_name` are plaintext, always — only phone/email get `encryptField`.
4. SMS templates (`sendOrderCreatedSms.ts`, `sendOrderReadySms.ts`, `resendPickupCodeSms.ts`, `sendRenewalReminderSms.ts`, `sendQuotaWarningSms.ts`) embed `order_number`/`pickup_code`/amounts — never a customer's name. Confirmed by reading all five.

---

## 1. Per-table classification (revised)

| Table | PII columns | Classification | Why (changes from Rev 1 marked) |
|---|---|---|---|
| `customers` | `first_name`, `last_name`, `phone` (ciphertext), `phone_bidx` | **ANONYMISE-IN-PLACE, full erasure, no attribution requirement** | Unchanged verdict; behavior detailed in §4 |
| `employees` | `first_name`, `last_name`, `email` (ciphertext), `phone` (ciphertext), `auth_user_id` | **ANONYMISE-IN-PLACE, stable label, attribution preserved** ⚠️ *changed* | See §4 — full erasure is wrong here because financial/audit rows must keep distinguishing between different former employees |
| `auth.users` | `email`, `phone`, `encrypted_password`, `raw_user_meta_data`, `identities`, sessions | **ANONYMISE-IN-PLACE at first, HARD-DELETE at final purge, with a retry queue** ⚠️ *changed* | See §7 for the queue design replacing Rev 1's best-effort language |
| `join_requests` | `first_name`, `last_name`, `email`, `phone` (**plaintext, always** — corrected framing, §6) | **HARD-DELETE** past a resolution/expiry window | Unchanged verdict |
| `pending_invites` | `phone` (plaintext) | **HARD-DELETE** past `expires_at` + grace | Unchanged |
| `sms_messages` | `phone` (plaintext today, proposed encrypted — §6), `message` | **SCRUB immediately on subject anonymization (customers only) + HARD-DELETE past a retention window (bulk)** ⚠️ *changed* | Two mechanisms now, not one — see §5 |
| `activity_logs` | `description` (free text) | **SCRUB immediately on subject anonymization (employees; customers need no scrub — see §3) + HARD-DELETE past a retention window (bulk)** ⚠️ *changed* | Two mechanisms now, not one — see §5 |
| `order_notes` | free-text `note` | **SCRUB-ON-ERASURE** ⚠️ *changed from NEVER-TOUCH* | See §3 — same in-RPC mechanism as `activity_logs`, scoped to the subject's own orders |
| `orders`, `order_items`, `payments`, `order_refunds`, `order_status_history`, `subscription_payments` | none direct | **NEVER-TOUCH** | Unchanged — ledger/audit rows, no PII of their own |
| `pending_payments` | none direct | **HARD-DELETE** past a resolution window | Unchanged |
| `laundries` | none direct | N/A — out of scope | Unchanged |

FK map and leaf-table analysis (Rev 1 §2/§3's structural findings) are unaffected by today's six decisions and still hold as written: zero cascades, `customers`/`employees` permanently FK-entangled once any order exists, `sms_messages`/`activity_logs`/`pending_invites`/`join_requests`/`pending_payments` are the structural leaves safe to hard-delete on a timer.

---

## 2. Stop PII at source — every `activity_logs.description` call site

Eleven inserts across ten files write a name, phone, or email into `description` as of the live code. Each is individually verdicted below. **All eleven are safe to convert** — none require the literal text to survive; every case is either redundant with a structured column that already exists, redundant with a column that should be added, or simply decorative.

| # | File | Current `employee_id` on the row | What's embedded in `description` | Verdict |
|---|---|---|---|---|
| 1 | `removeEmployee.ts:36-41` | `caller.id` (the **admin who removed**, i.e. actor) | `target.first_name/last_name` — the **removed employee**, i.e. subject | Convert. Actor ≠ subject and there's no column for the subject today — **needs a new nullable `target_employee_id` column** (proposed, not built). Description becomes static: `"Employee removed from the team"`. Display resolves both actor and target names at read time via joins, same pattern `getDashboardData.ts` already uses for `employee_id`. |
| 2 | `restoreEmployee.ts:28-33` | `caller.id` (actor) | `target.first_name/last_name` (subject) | Convert. Same fix as #1 — reuse the same proposed `target_employee_id` column. |
| 3 | `acceptInvite.ts:70-74` | **not set at all** | `firstName/lastName` — the person accepting, i.e. self | Convert. This is self-referential (no separate actor exists — it's an unauthenticated public flow). Fix: capture the new row's id from the `employees` insert (currently done without `.select()`) and set `employee_id` to it. No new column needed. Description becomes `"Employee accepted their invite"`. |
| 4 | `deleteMyAccount.ts:49-54` | `profile.id` (**already correct** — self) | `profile.firstName/lastName`, redundant with the column already set | Convert, trivially — just drop the interpolated name. No schema change needed. |
| 5 | `deleteLaundryAccount.ts:52-57` | `caller.id` (already correct — self) | `caller.firstName/lastName`, redundant | Convert, trivially — drop the name. |
| 6 | `approveJoinRequest.ts:71-77` | `emp.id` (the **approving admin**, actor) | `request.first_name/last_name` **and `request.email`** (subject — worst offender, leaks a raw email into a log line forever) | Convert. Actor ≠ subject, same class as #1/#2. Fix: capture the new `employees.id` from the insert (also currently done without `.select()`), use the same proposed `target_employee_id` column. Description becomes `"Employee joined via request"` — the email disappears entirely. |
| 7 | `inviteEmployee.ts:38-45` | `caller.id` (actor, correct) | `input.phone` — the phone **being invited**, no `employees` row exists yet | Convert. No employee subject exists at this point (only a `pending_invites` row). Drop the phone from the description entirely — `"Invite sent as {role}"` / `"Existing account linked as {role}"`. Nothing of operational value is lost: the phone is visible on the live `pending_invites` row for as long as it exists, and on the resulting `employees` row once accepted. |
| 8 | `resendInvite.ts:49-54` | `caller.id` (actor) | `invite.phone` | Convert — same reasoning as #7, drop the phone. |
| 9 | `resendOwnerInvite.ts:37-42` | n/a (`platform_admin_id`, platform-side, out of scope for tenant anonymization) | `invite.phone` | Convert — same reasoning as #7, though this is a platform-admin action on an *owner* invite, not a tenant employee/customer, so it sits outside the `anonymize_employee`/`anonymize_customer` RPCs' scope. Still worth fixing for the same PII-hygiene reason. |
| 10 | `sendSms.ts:69-74` and `:104-109` (two inserts, one file) | n/a — but `order_id` **is already set** | `input.phone` | Convert, cleanly — `order_id` already gives full structural traceability (and the same phone is already duplicated in the paired `sms_messages` row, itself being fixed in §6). Description becomes `"{triggerEvent} SMS sent"` / `"...blocked — overage limit..."`, zero interpolation. |
| 11 | `claimPaymentSent.ts:63-67` | **not set at all** | `profile.firstName/lastName` (self) plus non-PII transaction metadata (`referenceCode`, `targetPlan`, `paymentType`, `claimedAmount` — fine to keep) | Convert. Fix: add `employee_id: profile.id` to the insert (a pre-existing gap, unrelated to PII). Drop the interpolated name only; keep the rest of the description as-is. |

**`order_notes`** — zero call sites programmatically inject a name/phone/email. The single write path, `createOrderNote.ts`, stores exactly what the employee typed (`note: trimmed`), with no string interpolation at all. There is nothing to "convert" here — the risk is 100% user-authored free text, which is a different problem than the ten files above and is why §3 gives it a different treatment (scrub, not source-fix).

**Net effect of doing #1–11**: once shipped, no *future* `activity_logs` row will ever contain a name/phone/email again — every action type becomes `action_type` + structured actor/target IDs + non-PII metadata, with names resolved at read time exactly the way `getDashboardData.ts` already resolves `orders(customers(first_name,last_name))` today. This is what makes the immediate-scrub RPC logic in §5 a **transitional** mechanism, needed only for rows written before this conversion ships (or for laundries where it hasn't been deployed yet) — not a permanent fixture.

---

## 3. `order_notes` classification — SCRUB-ON-ERASURE, justified

Four-way bucket: HARD-DELETE / ANONYMISE / SCRUB-ON-ERASURE / KEEP.

- Not **HARD-DELETE**: unlike `activity_logs`/`sms_messages`, these are manually authored operational notes ("customer requested extra starch," "stain pre-treated") with the same kind of ongoing business/CYA value as `order_status_history` — deleting them on a timer would erase legitimate service history attached to a still-live order.
- Not **ANONYMISE**: there's no structured PII column to overwrite — it's one free-text field, and most notes contain no PII at all. Treating the whole row as "PII to anonymize" would be both wrong (destroys legitimate content) and imprecise (nothing to standardize it to).
- Not plain **KEEP**: it's a real, if incidental, PII container (§0.4 — a staff member typing a customer's name or alternate number into a note).
- **SCRUB-ON-ERASURE**, using the exact same best-effort regex mechanism as the `activity_logs` scrub in §5:
  - **For customer anonymization**: scoped and automatic. `orders.customer_id` already gives the exact set of orders to scan: `UPDATE order_notes SET note = regexp_replace(note, ..., '[redacted]', 'gi') WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id)`, matching the customer's pre-anonymization first/last name and (decrypted) phone, passed in as parameters the same way as the `activity_logs` case.
  - **For employee anonymization**: **not automated**, by design. An employee has no natural "their own orders" scope the way a customer does — a note mentioning an employee's name could live on any order in the laundry, not just ones they created or worked on. Regex-scanning every `order_notes` row in the tenant on every employee anonymization is disproportionate (high false-positive risk against common names, plus a full-table scan on every anonymization). Left as the same manual, logged, one-off redaction path Rev 1 proposed for the general case — now scoped specifically to "employee name mentioned by a colleague," which is both rarer and lower-severity than the customer case.

---

## 4. Employee vs. customer — two distinct RPCs, two distinct column maps

**Security model, revised per the Rev 3 changelog above:** both RPCs are `SECURITY DEFINER`, owned by a role with full table access, with `GRANT EXECUTE ... TO service_role` / `REVOKE EXECUTE ... FROM PUBLIC` — identical to `provision_laundry_tx` and `get_auth_user_by_phone`. They are invoked from the TS service layer via `createAdminClient()`, never via the request-bound session client, and are **not reachable at all** from a normal authenticated tenant session (PostgREST would reject the call outright — no `EXECUTE` grant exists for `authenticated`). This is a deliberate departure from `create_order_tx`'s `SECURITY INVOKER` model: erasure is irreversible-adjacent (it ends a Recycle-Bin restore path permanently) and shouldn't sit on the same trust surface as routine tenant CRUD.

**Consequence — the RPC gets no RLS backstop.** `tenant_isolation` policies never run under `service_role`. Whatever calls `anonymize_customer_tx`/`anonymize_employee_tx` (the TS service function wrapping it) **must independently verify**, before invoking: (a) the caller is authorized (an admin of the relevant laundry, or — see the open question below — the scheduled job itself acting with system authority) and (b) the target row's `laundry_id` actually matches the caller's laundry, the same two checks `deleteLaundryAccount.ts`/`removeEmployee.ts` already perform in the TS layer today via `requireRole(profile, ROLES.ADMIN)` before touching the DB, even though those two still use the session client underneath. Skipping this check would be a confused-deputy hole: anything that can reach the wrapping service function could otherwise anonymize any laundry's customer/employee, not just its own.

### Two triggers, one shared RPC pair (resolved in Rev 4 — see changelog)

Both `anonymize_customer_tx`/`anonymize_employee_tx` are invoked from exactly two call paths, never any other:

| Trigger | Caller | Gated on retention window? | Purpose |
|---|---|---|---|
| **1. Scheduled purge** | The retention-timer cron itself (§8), running under `service_role`, no human in the loop | **Yes** — `deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL 'TBD'` | Routine, timer-based erasure once the Recycle-Bin grace period lapses |
| **2. On-request erasure** | A platform admin (via the internal Rinsion dashboard, `requirePlatformAdmin()`-gated) or another `service_role`-authenticated internal process | **No** — fires immediately regardless of how recently the row was soft-deleted, or even if it hasn't been soft-deleted yet at all (see note below) | Discharges an Act 843 erasure request on demand — a timer alone doesn't satisfy a data subject's right to request erasure now |

**Explicitly not built:** a tenant-facing "erase now" button in the Recycle Bin or anywhere else in the tenant app. Tenant admins keep exactly the UI they have today (Restore only). If a data subject's request comes in, it's handled by Rinsion staff through the platform dashboard, not by the tenant themselves — this is what keeps the destructive action off a self-serve surface while still discharging the legal obligation.

**Note on the "even if it hasn't been soft-deleted yet" case:** an Act 843 request could plausibly arrive for a customer/employee who's still active (not yet soft-deleted via `deleteCustomer`/`removeEmployee` at all). Trigger 2's wrapper should soft-delete first if needed (same `deleted_at` write the existing Stage-1/2 flows already perform) and then immediately anonymize in the same admin action, rather than requiring a platform admin to separately soft-delete via some other path first. This is a small addition to the wrapper function, not to the RPC itself — the RPC's precondition (`deleted_at IS NOT NULL`, from §4's original design) stays a hard requirement for both triggers; trigger 2's wrapper just satisfies it inline instead of assuming it's already true.

### Erasure-request intake: where the request is received and recorded

A new table, proposed not built, gives the on-request path a durable, auditable record — the same architectural family as `pending_payments`/`pending_invites`/`auth_identity_purge_queue` (a claim/request awaiting resolution):

```sql
CREATE TABLE erasure_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id    UUID NOT NULL REFERENCES laundries(id),
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('customer', 'employee')),
  subject_id    UUID NOT NULL,  -- polymorphic (customers.id or employees.id depending on
                                 -- subject_type) — no single FK is possible across two target
                                 -- tables, same precedent as pending_invites.created_by
  reason        TEXT,           -- internal note only (e.g. "Act 843 request via support
                                 -- ticket #1234") — never shown to the tenant, and itself a
                                 -- potential incidental-PII free-text field, same caveat as
                                 -- order_notes (§3)
  requested_by  UUID REFERENCES platform_admins(id),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  resolved_by   UUID REFERENCES platform_admins(id),
  resolved_at   TIMESTAMPTZ
);

REVOKE ALL ON TABLE erasure_requests FROM anon, authenticated;
```

Both **creating** and **fulfilling** an `erasure_requests` row live entirely on the platform-admin/service-role side — consistent with "not self-serve from the tenant UI," this table is never written or read from the tenant-facing app at all, only from the internal Rinsion platform dashboard (the same surface `suspendLaundry.ts`/`extendTrial.ts`/`resendOwnerInvite.ts` already use). Recording the request as its own step, separate from fulfilling it, matters for a realistic workflow: a platform admin can log that a request came in, verify the requester's identity out-of-band, and only then fulfill it — rather than the intake and the irreversible action being the same click.

**Unlike the other operational logs in this plan, `erasure_requests` is compliance evidence, not disposable log noise** — a completed row is the proof that a specific request was received and fulfilled on specific dates. It should not join the short-window purge family in §8 the way `activity_logs`/`sms_messages` do; if it's retained at all on a timer, that timer should be long (or the table left unpurged entirely), which is the opposite instinct from every other table in this plan. Flagging this now as its own retention question, separate from the TBD windows already tracked, rather than silently bucketing it with the rest.

### On-request fulfillment — the wrapper function and its checks

Proposed `src/services/platform/fulfillErasureRequest.ts` (name illustrative, not built), following the exact shape of `suspendLaundry.ts`/`extendTrial.ts`:

```
fulfillErasureRequest(requestId: string): Promise<ServiceResult<null>>
  1. platformAdminId = await requirePlatformAdmin()
     if (!platformAdminId) return { success: false, error: 'Unauthorized.' }
  2. admin = createAdminClient()
     request = admin.from('erasure_requests').select(...).eq('id', requestId).eq('status','pending').single()
     if (!request) return { success: false, error: 'Request not found or already resolved.' }
  3. Validate the (subject_id, laundry_id, subject_type) triple is internally consistent —
     e.g. for subject_type = 'employee', confirm employees.id = subject_id actually has
     laundry_id = request.laundry_id. Defensive data-integrity check, not an authorization
     check (platform admins are legitimately cross-tenant by design — platform_admins has
     zero laundry_id of its own, per the existing RLS comment on that table).
  4. If not already soft-deleted, soft-delete first (see note above).
  5. Decrypt whatever plaintext the RPC needs (old name/phone) via decryptField(), compute
     the anonymized-placeholder ciphertext via encryptField(), and call
     anonymize_customer_tx(...) / anonymize_employee_tx(...) accordingly — same parameter
     shapes as §4/§5, with an added p_erasure_request_id UUID parameter (new) so the RPC's
     own activity_logs entry (see below) can reference which request it fulfilled.
  6. On success: admin.from('erasure_requests').update({ status: 'completed', resolved_by:
     platformAdminId, resolved_at: NOW() }).eq('id', requestId)
```

**Confirming the confused-deputy guard explicitly, since this is the exact risk `SECURITY DEFINER` + `service_role` introduces:** the `requirePlatformAdmin()` call in step 1 is the *entire* authorization boundary for trigger 2. There is no RLS policy backstop — `service_role` bypasses `tenant_isolation` entirely, same as every other platform-admin action in this codebase. This lives in the TS wrapper, not the database, which means **only these two designated call paths (the wrapper above, and the scheduled-purge cron) may ever invoke the RPC** — the `GRANT EXECUTE ... TO service_role` / `REVOKE ... FROM PUBLIC` on the RPC itself stops any `authenticated`/`anon` caller from reaching it directly via PostgREST, but it does nothing to stop a *future* internal service_role-authenticated route from calling it without threading through `requirePlatformAdmin()` first. That's a code-review-time invariant to protect, not something the database enforces — worth calling out explicitly to whoever eventually builds this, since it's the one place in the whole plan where "the database says no" isn't actually true.

**Provenance in the anonymization's own audit trail:** both RPCs should end by inserting one `activity_logs` row of their own — `action_type: 'CUSTOMER_ANONYMIZED'` / `'EMPLOYEE_ANONYMIZED'`, `laundry_id`, and a description naming *which trigger* fired it without reintroducing any PII (per §2's whole point): `"Customer permanently anonymized (scheduled retention purge)"` or `"Employee permanently anonymized (erasure request fulfilled)"`, optionally referencing `p_erasure_request_id` when trigger 2 fired. This closes the loop with §2 — the anonymization event itself must not violate the very policy it exists to enforce.

**Customers require no attribution — full erasure.** Nothing downstream needs to tell two different anonymized customers apart; `orders.customer_id` continuing to resolve to *a* row (any row) is all that's structurally required.

**Employees require attribution — the identity must be erasable, but the actor must stay distinguishable.** Confirmed downstream dependents, all of which need to keep resolving to a *specific*, *distinct* employee row, not an interchangeable placeholder:

- `orders.created_by_employee_id` (NOT NULL) — who created this order
- `payments.recorded_by_employee_id` (NOT NULL) — who took this cash/momo payment (accountability-sensitive: cash handling disputes need to know *which* former employee, not just "a former employee")
- `order_refunds.recorded_by_employee_id` (NOT NULL) — who authorized this refund (same fraud/dispute sensitivity, arguably higher)
- `order_status_history.employee_id` (NOT NULL) — who changed this order's status
- `subscription_payments.recorded_by_employee_id` (nullable) — which internal party verified a manual MoMo payment
- `join_requests.resolved_by_employee_id` (nullable) — who approved/rejected a join request
- `activity_logs.employee_id` / proposed `target_employee_id` (§2) — general audit attribution

All seven are satisfied by construction: **the RPC never deletes the `employees` row or changes its `id`** — only `auth_user_id` is nulled and the PII columns are overwritten. Every FK above still resolves to the same UUID it always did. What changes is *readability*: instead of a fixed generic string (which would make every anonymized employee indistinguishable in a payments/refunds report), the label is derived per-row from the employee's own immutable `id`, computed in pure SQL with no app-layer crypto needed:

```sql
'Staff #' || upper(substring(replace(p_employee_id::text, '-', ''), 1, 8))
```

Fits the existing `${firstName} ${lastName}` display convention used everywhere (`getEmployees.ts`, `getDashboardData.ts`, reports) with zero UI changes: `first_name = 'Former'`, `last_name = 'Staff #A1B2C3D4'` renders as **"Former Staff #A1B2C3D4"** — stable, distinct per employee, requires no lookup of the raw UUID to tell two anonymized employees apart in a report.

### `anonymize_customer_tx` — column map (unchanged from Rev 1, full erasure)

```sql
anonymize_customer_tx(
  p_customer_id     UUID,
  p_anon_phone_ct    TEXT,  -- encryptField(SENTINEL_PHONE), computed by caller
  p_anon_phone_bidx  TEXT,  -- computeBlindIndex('anonymized:' || p_customer_id), computed by caller
  p_old_first_name   TEXT,  -- pre-update value, for the order_notes scrub in §3
  p_old_last_name    TEXT,
  p_old_phone_plain  TEXT   -- decryptField(customers.phone), computed by caller, used transiently for regex matching, never stored
)
```

| Column | New value | Note |
|---|---|---|
| `first_name` | `'Deleted'` | fixed, no attribution need |
| `last_name` | `'Customer'` | fixed |
| `phone` | `p_anon_phone_ct` | `NOT NULL`, must stay non-null ciphertext |
| `phone_bidx` | `p_anon_phone_bidx` | `NOT NULL`; per-row sentinel, though the partial unique index (`WHERE deleted_at IS NULL`) already makes collision moot |
| `customer_code` | unchanged | not PII |

Plus, in the same transaction (§5 detail): scrub `sms_messages` rows for this customer, and scrub `order_notes` rows for this customer's orders using `p_old_first_name`/`p_old_last_name`/`p_old_phone_plain`. **No `activity_logs` scrub for customers** — confirmed in §2/Rev 1's trace that no order-related description embeds a customer's name or phone anywhere in the current codebase.

### `anonymize_employee_tx` — column map (revised, attribution preserved)

```sql
anonymize_employee_tx(
  p_employee_id      UUID,
  p_anon_phone_ct     TEXT,  -- encryptField(SENTINEL_PHONE), computed by caller
  p_old_first_name    TEXT,  -- pre-update value, for the activity_logs scrub
  p_old_last_name     TEXT,
  p_old_phone_plain   TEXT   -- decryptField(employees.phone), used transiently, never stored
)
RETURNS UUID  -- the detached auth_user_id, so the service layer can hand it to
              -- the neutralization queue in §7
```

| Column | New value | Note |
|---|---|---|
| `first_name` | `'Former'` | ⚠️ changed from fixed `'Deleted'` |
| `last_name` | `'Staff #' \|\| upper(substring(replace(id::text,'-',''),1,8))` | ⚠️ new — stable, distinct, derived from the row's own `id` in pure SQL |
| `email` | `NULL` | nullable column, no placeholder needed |
| `phone` | `p_anon_phone_ct` | `NOT NULL`, placeholder ciphertext; no blind index exists on `employees.phone` so no collision risk either way |
| `auth_user_id` | `NULL` | detaches the FK — see §7 |
| `is_active` | unchanged (`FALSE`) | already set by `removeEmployee`/`deleteMyAccount` |
| `deleted_at` | unchanged | already set |

Plus, in the same transaction: scrub `activity_logs.description` for this employee (§5 detail) using `p_old_first_name`/`p_old_last_name`/`p_old_phone_plain`. **No `sms_messages` scrub for employees** — `sms_messages` has no `employee_id` column and no structural link to an employee at all.

Precondition for both RPCs, unchanged from Rev 1 **for the scheduled-purge trigger only**: `deleted_at IS NOT NULL` and past the TBD anonymization grace period — a second stage on top of the existing soft-delete, not a replacement for it. The on-request trigger (below) satisfies `deleted_at IS NOT NULL` inline if needed and is never gated on the grace period itself — see the two-trigger design that follows.

---

## 5. Immediate scrub mechanics — what each RPC touches, right now, not deferred

This is the direct answer to "list every column/table a single subject's PII can reach, and confirm the function covers all of them."

### Customer (`anonymize_customer_tx`, single transaction)

| Table | Scope | Action |
|---|---|---|
| `customers` | the row itself | Full overwrite, §4 |
| `sms_messages` | `WHERE customer_id = p_customer_id` | `UPDATE ... SET phone = '[redacted]', message = '[redacted — customer erased]'` — a full column overwrite, not regex, since `customer_id` already scopes exactly the right rows precisely |
| `order_notes` | `WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id)` | Best-effort `regexp_replace` against `p_old_first_name`, `p_old_last_name`, `p_old_phone_plain` — see caveat below |
| `orders`, `payments`, etc. | — | Untouched (NEVER-TOUCH, no PII of their own) |
| `activity_logs` | — | **No scrub needed** — confirmed no customer PII ever reaches `description` |

### Employee (`anonymize_employee_tx`, single transaction)

| Table | Scope | Action |
|---|---|---|
| `employees` | the row itself | Full overwrite with stable label, §4 |
| `activity_logs` | `WHERE laundry_id = <employee's laundry> AND (employee_id = p_employee_id OR description ILIKE '%' \|\| p_old_first_name \|\| ' ' \|\| p_old_last_name \|\| '%' OR description ILIKE '%' \|\| p_old_phone_plain \|\| '%')` | `employee_id = p_employee_id` alone catches the self-referential cases (#4, #5, #11 in §2, once fixed). The `ILIKE` fallback is required for **legacy rows written before §2's conversion ships** — specifically #1, #2, #6 (removed/restored/joined-via-request, where the subject's name was never in a structured column at all) and #7, #8 (invite-phone rows, where no `employees` row existed yet at write time so there's no `employee_id` to match on either). Once §2 is fully shipped, the text-match branch becomes a no-op for all newly written rows — kept only as a permanent safety net for whatever was written before the migration date. |
| `order_notes` | — (§3) | **Not automated** — manual path only, per §3's reasoning |
| `sms_messages` | — | **No scrub needed** — no structural or textual link between `sms_messages` and an employee anywhere in the schema |

**Caveat on the `ILIKE` text-match branches (both tables):** this is string matching on free text, not a cryptographic guarantee. It will miss a name/phone formatted differently than it was stored (e.g. a phone with different spacing, or a nickname used instead of the legal first name), and — rarely — could over-match a common name shared with an unrelated person in the same tenant (mitigated by scoping every match to `laundry_id`, which the RPC already has). This is a direct consequence of ever having stored PII as interpolated free text in the first place, which is exactly why §2's source-level fix matters: it's the only way to get a *guaranteed*, not best-effort, scrub for everything written going forward.

**Reconciling with the retention purge (§6 below):** the immediate scrub and the scheduled purge are no longer redundant, they're complementary. The scrub fires the moment a *specific* subject is anonymized, regardless of how recently their rows were written (a customer anonymized two days after their first order gets those two-day-old `sms_messages` rows scrubbed immediately — the purge wouldn't touch them for months). The purge fires on a timer across *all* rows, independent of whether any particular subject was ever anonymized — it's the backstop for the general "we don't need any operational logs older than N days" policy, not the erasure mechanism.

---

## 6. Encryption-at-rest fixes (independent of deletion, proposed not built)

### (a) `sms_messages.phone` — propose encrypting; no blind index needed

`sms_messages.phone` is plaintext in every write path (`sendSms.ts`, `sendSystemSms`) and is never queried by exact match anywhere — the two indexes that exist (`idx_sms_messages_cap_query` on `(laundry_id, counts_toward_cap, created_at)` and `idx_sms_messages_failures` on `(laundry_id, status, created_at)`) never touch `phone`. That means, unlike `customers.phone`, **no blind index is needed** — a plain `encryptField(phone)` before insert is sufficient, mirroring the exact `v1:iv:tag:ct` envelope already used elsewhere, no column type change required.

This directly closes the gap the app's own `fieldEncryption.ts` header claims to close ("a leaked `SUPABASE_SERVICE_ROLE_KEY` or raw DB/SQL access doesn't hand out plaintext PII") — today that promise is broken specifically for `sms_messages`, for the entire live window before a message is scrubbed or purged (potentially the customer's whole active relationship with the laundry, which could be months or years).

Companion changes needed: a backfill script mirroring the existing `scripts/backfillFieldEncryption.ts` pattern, `encryptField()` added at both `sendSms.ts` insert sites, and `decryptField()` added to any read path that currently selects `sms_messages.phone` for display — none was found in the services reviewed so far, but this hasn't been exhaustively verified against every admin/reporting screen, so treat "no UI reads it today" as unconfirmed rather than certain.

`message` body: lower priority. Today's five SMS templates carry no PII beyond the phone number already covered above (confirmed in §0.4). Encrypting it too would be defense-in-depth against a future template change nobody remembers to re-audit for PII, not a fix for a current leak — worth doing for consistency, not urgent.

### (b) `join_requests` plaintext gap — propose encrypting `phone`/`email`, not `first_name`/`last_name`

Corrected framing (§ changelog point 3): the only write path is `joinLaundry.ts`'s `submitJoinRequest()`, and it never encrypts. This row can sit plaintext for as long as the request stays pending — potentially indefinitely if an admin never acts on it — unlike every other table holding the same categories of data.

Proposal, matching the rest of the schema's convention (only phone/email get ciphertext, never names, since `customers`/`employees` don't encrypt names either):
- `submitJoinRequest()`: `encryptField(phone)`, `encryptField(email)` (nullable-safe, matching `approveJoinRequest.ts`'s existing `request.email ? encryptField(...) : null` pattern) before insert.
- `approveJoinRequest.ts`: currently does `encryptField(request.phone)`/`request.email ? encryptField(request.email) : null` when copying into `employees` — this **assumes the source is plaintext**. Once (a) ships, the source is already ciphertext under the identical `FIELD_ENCRYPTION_KEY`/algorithm — the cleanest fix is to copy the ciphertext value straight through (no decrypt-then-reencrypt round trip needed; a valid `v1:iv:tag:ct` envelope is self-contained and decrypts correctly regardless of which row it lives in).
- No blind index needed — there's no uniqueness constraint on `join_requests.email`/`phone` today.
- **Needs verification, not yet checked**: whatever UI renders the pending-join-requests admin review screen presumably selects `join_requests.email`/`phone`/`first_name`/`last_name` directly for display today — once (a) ships, that read path needs `decryptField()` added. This file wasn't located in this pass; flag as a required companion change to confirm before building.

---

## 7. `auth.users` failure path — durable retry, not best-effort

Rev 1's stance ("log and don't roll back; a stray orphaned `auth.users` row is a cleanup nicety") is replaced. The two-step neutralization (null `employees.auth_user_id` in-transaction, then `admin.auth.admin.deleteUser()` out-of-transaction) can fail on step two for ordinary reasons (network blip, transient GoTrue error) — and once step one has committed, the only record of "this identity still needs deleting" would otherwise live nowhere durable.

**Proposed: a small reconciliation queue table**, the same architectural family as `pending_payments`/`pending_invites` (a claim awaiting external resolution) — not built, proposed:

```sql
CREATE TABLE auth_identity_purge_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  employee_id  UUID NOT NULL REFERENCES employees(id),  -- for audit/debugging; employees rows are never hard-deleted, so this stays valid forever
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT,
  completed_at TIMESTAMPTZ
);

-- Per the Rev 3 changelog: new tables get Supabase's unrevoked
-- anon/authenticated default grants unless explicitly narrowed at creation.
-- This table is service_role-only end to end (written by anonymize_employee_tx
-- itself, read/updated only by the reconciliation job) — ship it already
-- locked down rather than as a follow-up migration, matching the posture
-- 20240021000000 just established for every existing table.
REVOKE ALL ON TABLE auth_identity_purge_queue FROM anon, authenticated;
```

**Flow:**
1. Inside `anonymize_employee_tx` (same transaction as the column overwrite in §4): capture `v_auth_user_id := auth_user_id` before nulling it, `INSERT INTO auth_identity_purge_queue (auth_user_id, employee_id) VALUES (v_auth_user_id, p_employee_id)`, then null `employees.auth_user_id`, then commit. **The intent to delete is now durable before the detach even lands** — if the process crashes the instant after commit, the queue row survives.
2. Service layer, immediately after the RPC returns: attempt `admin.auth.admin.deleteUser(v_auth_user_id)`.
   - Success → `UPDATE auth_identity_purge_queue SET completed_at = NOW() WHERE auth_user_id = v_auth_user_id AND completed_at IS NULL`.
   - Failure → `UPDATE ... SET attempts = attempts + 1, attempted_at = NOW(), last_error = <message>`, row stays pending.
   - **Idempotency note**: if `deleteUser` returns a "user not found" style error, treat that as success (goal already achieved — e.g. a previous attempt's success wasn't recorded due to a crash between the GoTrue call and the queue update), not as a failure to retry forever.
3. A scheduled reconciliation job (same daily-cron family as §5's retention purge) scans `WHERE completed_at IS NULL AND attempts < TBD-max-attempts AND (attempted_at IS NULL OR attempted_at < NOW() - INTERVAL 'TBD backoff')` and retries.
4. **Detection of a stuck failure**: `WHERE completed_at IS NULL AND attempts >= TBD-max-attempts` is the exact query for "needs a human." Surface this as a count somewhere visible to ops (existing platform/internal admin surface, or a log-based alert) — this is meant to be a rare-but-must-not-be-silent state, not something that needs a new UI page.
5. The queue table itself is not permanent — once `completed_at` is old, it's operational scaffolding like `pending_payments`, and can join the same retention-purge family in §5 on its own TBD window.

This closes the specific gap raised: detection is `completed_at IS NULL`, retry is the scheduled job, and no identity is ever left in a state where the application has forgotten it still owes a deletion — the queue row, not application memory, is the source of truth for "is this done."

**Customers have no equivalent step** — customers are never Supabase Auth users (no `auth_user_id` on `customers` at all), so `anonymize_customer_tx` has nothing analogous to neutralize.

---

## 8. What remains permanently — the de-identified shell (updated)

- `customers`: UUID, `laundry_id`, `customer_code`, `deleted_at` — name/phone fully scrubbed, no distinguishing label (none needed).
- `employees`: UUID, `laundry_id`, `branch_id`, `role`, `is_active=false`, `deleted_at` — name/email/phone/`auth_user_id` scrubbed, but `first_name`/`last_name` carry a **stable, distinct label** (`"Former Staff #A1B2C3D4"`) so every historical `orders`/`payments`/`order_refunds`/`order_status_history`/`subscription_payments`/`join_requests` row that points at them stays individually attributable in reports.
- `orders`, `order_items`, `payments`, `order_refunds`, `order_status_history`, `subscription_payments` — untouched.
- `auth.users` — hard-deleted once the queue in §7 confirms completion (not immediately upon anonymization, if the async delete hasn't landed yet).
- `activity_logs`, `sms_messages` — subject-specific PII scrubbed immediately (§5); full rows still purged in bulk past retention (§ formerly 5, folded into the scheduled-purge table below).
- `order_notes` — subject-specific text scrubbed immediately for customers (§3/§5); rows themselves never purged on a timer (retained for operational history).
- `pending_invites`, `join_requests`, `pending_payments`, `auth_identity_purge_queue` — fully purged past their windows.

**Execution model, per the Rev 3 changelog:** this job must run under `service_role` — not optionally, now that `DELETE` is revoked from `authenticated`/`anon` on every target table below. Either a `pg_cron` job scheduled with superuser/`postgres`-role context, or an external cron hitting a route that uses `createAdminClient()`, matching the trust boundary §4's RPCs now use.

**This table covers trigger 1 (scheduled purge) only.** Trigger 2 (on-request erasure, §4) doesn't wait for any row in this table's conditions to become true — it's invoked directly by a platform admin through `fulfillErasureRequest`, independent of how old the target row is.

### Scheduled purge table (retention windows still TBD, unchanged targets from Rev 1 except as noted)

| Target | Condition | Action | Retention window |
|---|---|---|---|
| `activity_logs` | `created_at < NOW() - INTERVAL 'TBD'` | `DELETE` (full row — the immediate scrub in §5 already removed the sensitive text; this purge is now purely about *general* log retention, not erasure) | TBD |
| `sms_messages` | `created_at < NOW() - INTERVAL 'TBD'` AND outside the current billing cycle | `DELETE` | TBD — must not eat into `idx_sms_messages_cap_query`'s current-cycle quota math; note this constraint only applies to the full-row purge, **not** to the §5 immediate column-level scrub, which never deletes a row and therefore never disturbs quota accounting |
| `pending_invites` | `expires_at < NOW() - INTERVAL 'TBD grace'` | `DELETE` | TBD — no shorter than the 7-day/1-hour TTLs already specced in `docs/auth_spec.md` §1 |
| `join_requests` | resolved past TBD, or stale-pending past TBD | `DELETE` | TBD — short window justified further now that (b) in §6 is proposed but not yet shipped |
| `pending_payments` | resolved past TBD | `DELETE` | TBD |
| `auth_identity_purge_queue` | `completed_at < NOW() - INTERVAL 'TBD'` | `DELETE` | TBD — new in this revision, §7 |

---

## 9. Open items carried forward or newly raised

0. **Resolved in Rev 4** (was open in Rev 3): two triggers, scheduled purge + platform-admin/service-role on-request erasure, no tenant-facing self-serve action. See §4.
0a. **Resolved**: `erasure_requests` is retained indefinitely — never added to the purge sweep (§8), no retention constant. A `completed` row is the only durable record that a specific Act 843 request was received and fulfilled, by whom, and when; deleting it later would destroy the exact evidence a regulator or the requester's own follow-up would ask for, with no compensating benefit (the row itself carries none of the anonymized subject's PII once fulfilled — the RPC already scrubs `customers`/`employees` in place, and `reason` is the only free-text field, same incidental-PII caveat as `order_notes`, §3). `pending`/`rejected` rows are kept too, on the same reasoning: a rejected request and its reasoning are as much a compliance artifact as a completed one. If this ever needs revisiting (e.g. a regulator specifies a maximum retention for closed compliance records), it should be a long, explicit window added to `constants/retention.ts` — not the short-window default used elsewhere in this plan.
0b. **Resolved**: minimal platform-admin UI built at `src/app/internal/erasure-requests/` (list pending + create form + Fulfill action), mirroring the Manual Payments Queue pattern. `createErasureRequest` now validates the (subject_id, laundry_id, subject_type) triple before insert, matching the check `fulfillErasureRequest` already performed at fulfillment time — invalid rows can no longer enter the queue at all.
1. `join_requests` encryption fix (§6b) needs its admin-review-screen read path located and updated — not yet found in this pass.
2. `sms_messages.phone` encryption (§6a) needs every read path double-checked for a display use that would need `decryptField()` — none found so far, not exhaustively verified.
3. The proposed `target_employee_id` column on `activity_logs` (§2, items #1/#2/#6) is a schema addition this plan is recommending but has not designed a full migration for — needs its own follow-up pass (nullable, `REFERENCES employees(id)`, no `ON DELETE` per §0.1's universal convention) before it's buildable.
4. All retention-period numbers remain TBD, with the same two functional (non-legal) lower bounds flagged in Rev 1: `sms_messages` full-row purge can't cross into the current billing cycle; `pending_invites`/reset-token purge can't be shorter than the TTLs already specced in `docs/auth_spec.md` §1.
