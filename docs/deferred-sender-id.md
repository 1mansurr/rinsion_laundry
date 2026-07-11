# Deferred Feature: Per-Laundry Branded Sender IDs

**Status:** Parked. Launching on shared `Rinsion` sender ID.
**Revisit when:** Onboarding laundries that want their own brand on customer SMS.

## Decision at parking time
- Launch with ONE shared, mNotify-approved sender ID: `Rinsion`.
- All laundries send under `Rinsion` until this feature ships.
- Authorization docs (mNotify requirement #3) deliberately skipped for early days —
  acceptable while pilot laundries register their own names via us informally.

## What to build when un-parking
1. `laundries.sms_sender_id` (nullable text) + `sms_sender_id_updated_at` (timestamptz).
   - Null → fall back to shared `Rinsion` ID.
   - CHECK: `^[A-Za-z0-9]{3,11}$` AND contains ≥1 letter. No spaces.
2. Shared validation util (UI + service import the SAME rule): 3–11 chars,
   alphanumeric, ≥1 letter, no spaces.
3. Service-layer enforcement (`updateSenderId`): admin-only, format check,
   14-day cooldown (compare against `sms_sender_id_updated_at`), no-op guard,
   activity log, then call mNotify register.
4. mNotify registration on save via `lib/mnotify.ts` wrapper.
   - Endpoint: POST /api/senderid/register  (fields: sender_name, purpose)
   - `purpose` must be specific per laundry → drives instant approval, e.g.
     "Order confirmations and pickup alerts for {laundry.name}".
   - Approval: instant if purpose is clear, else up to 24h.
   - No attachment field in API → authorization docs (if reintroduced) go
     out-of-band, so provisioning is semi-manual.
5. Settings UI: live char counter, maxLength=11, space-strip on keystroke,
   cooldown lock with "change again in N days", disabled save on invalid/locked.
6. Fallback logic in notification service: use laundry's sender ID once approved,
   else shared `Rinsion` ID (covers mid-onboarding + rare 24h-review cases).

## CRITICAL: two message template sets, keyed by sender ID
This is the part not to forget. Message COPY differs by which ID sends it.

- **Shared `Rinsion` ID:** sender line does NOT identify the laundry, so the
  BODY must name it.
  e.g. "Your order at {laundry.name} is ready for pickup. Code: {code}"
- **Laundry's own branded ID:** sender line already IS the laundry name, so the
  body drops the "at {laundry.name}" prefix and reads cleaner.
  e.g. "Your order is ready for pickup. Code: {code}"

Implementation: `smsTemplates.ts` exposes template variants; the send function
picks the set based on whether the resolved sender ID is the shared one or the
laundry's own. Applies to BOTH triggers (ORDER_CREATED, ORDER_READY) and the
PICKUP_CODE_RESEND path.

## Hard constraints (do not re-litigate)
- 11 chars is a GSM/network cap across MTN, Telecel, AirtelTigo — not lift-able.
- 14-day cooldown lives in the service (business rule), not a DB trigger.
- Never blind-truncate a laundry name into a sender ID — suggest + let them edit.