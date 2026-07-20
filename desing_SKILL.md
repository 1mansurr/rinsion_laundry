# desing_SKILL.md — Rinsion Design System Unification Pass

## Purpose

Rinsion now has three surfaces that need to read as one product: the **app** (dashboard, orders, customers, settings — already built and working), the **landing page** (`src/app/LandingPage.tsx`, `src/app/(legal)/*` — just shipped), and **whatever ships next** (more features are coming, and they need to inherit a consistent system from day one instead of drifting further).

This is not a rebuild. The app already has a mature primitives library (`src/components/ui/*`) and a Tailwind theme that mostly matches the current design language. The job is to:

1. Make the design **tokens** (radius, in particular) consistent between what's documented and what's actually rendered, app-wide.
2. Bring the **landing page** onto the exact same token set as the app, instead of the ad hoc values it currently uses.
3. Close a short list of **pattern gaps** the new design system introduces that the app doesn't have yet.
4. Leave the system in a state where the next feature is built *with* the system, not around it.

## Ground truth

**Single source of truth:** `rinsion_design_system/Rinsion Design System.dc.html`.

Ignore `SKILL.md` at the project root and everything it references (`Brand Foundations.dc.html`, `Rinsion App.dc.html`, `Rinsion Mobile.dc.html`, `Rinsion Standard Screens.dc.html`, `Rinsion_Design_Brief.md`). That skill governed an earlier build pass against an older, now-superseded design system, and those reference files are gone from the repo. It does not bind this work.

**Secondary reference:** `src/app/LandingPage.tsx` as it exists today — it's the newest surface and the closest thing to a "typical output" of the new design system, but it was hand-built quickly and has its own token drift (see Phase 1). Don't treat it as more authoritative than the design system doc itself.

## What's already true — don't redo this

- Color palette, functional colors, and the order-status color system in `tailwind.config.ts` already match the design system doc exactly (verified hex-for-hex).
- Font (Public Sans), type scale, and letter-spacing tokens are already wired and in use.
- Spacing (4/8 base) is already the convention in practice.
- A full primitives library already exists: `Button`, `Card`, `Modal`, `Sheet`, `Toast`, `Banner`, `EmptyState`, `Table`, `Pagination`/`UrlPagination`, `StatusBadge`, `StatCard`, `PickupCodeChip`, `OMark`, `Wordmark`, `Spinner`, `CommandPalette`, `GlobalSearch`, `SearchableSelect`, `ConfirmDialog`, `Input`, `Select`, `Textarea`, `PasswordInput`.
- `StatusBadge` correctly implements the **4-state** order lifecycle (`received → processing → ready → collected`, plus `cancelled`) — see Resolved decisions below.

Do not rebuild any of the above from scratch. This pass corrects and extends it.

## Resolved decisions

These came up reading the new design system doc against the live app and are settled — don't re-litigate them mid-pass:

1. **Order status stays 4-state.** The design system doc's §09 mockup shows a 5th "Confirmed" status. The app deliberately retired `confirmed` in migration `20240032000000_retire_confirmed_order_status.sql` — it never gated any behavior. The doc's mockup is stale on this one point. When implementing §09-derived UI (the order-detail timeline, stepper), build it for `received → processing → ready → collected` (+ `cancelled` as the always-available branch), not the 5-state version shown in the doc.

2. **Auth screens are a visual reference only.** The design system doc's §13 mocks phone-only, passwordless "send code" login. The live app has password-based login with a phone/email identity toggle, plus a full password-reset and phone-reset system already built (see project memory: `project_phone_reset_rewrite`). Do not change the auth *flow* or *behavior*. Restyle the existing login/signup cards (radius, spacing, button treatment, card shadow) to match §13's visual treatment — same card layout, same soft-corner card-on-warm-background composition — but keep the real fields, the phone/email toggle, and the password flow exactly as they are.

## Phase 1 — Token correction (radius)

**Goal:** Fix the radius scale everywhere it's wrong, from the theme down. This is the highest-leverage, lowest-risk phase — most of it is a Tailwind config change plus a mechanical class-rename pass, not new component work.

**The problem, quantified:**

| Element | Doc spec | Current | Where |
|---|---|---|---|
| Buttons, inputs, selects | 12px | 7px (`rounded-7`, 121 call sites) | `Button.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, and inline throughout the app |
| Cards, panels | 18px | 10px (`rounded-10`, 131 call sites) | `Card.tsx` (comment admits it already overrides an *older* 12px spec — this will be the third value) |
| Modals, mobile sheets | 22px | 12px (`rounded-11`/`rounded-[12px]`, ~8 call sites) | `Modal.tsx`, `Sheet.tsx` |
| Chips, tiles, tags | 10px | Mostly `rounded-9` (9px, 11 sites) — close but not exact | Various |
| Pills, avatars, status | 999px (full) | Already `rounded-full` (80 sites) | Correct, no change |

The app also has **three parallel radius mechanisms** in play: the custom pixel classes (`rounded-7`, `rounded-9`, `rounded-10`, `rounded-11`), Tailwind's own default scale (`rounded-lg`=8px, `rounded-xl`=12px, `rounded-2xl`=16px — 37 + 17 + 3 sites respectively), and ad hoc arbitrary values (`rounded-[8px]`, `rounded-[12px]`, `rounded-[13px]`, `rounded-[14px]`, `rounded-[18px]`, `rounded-[20px]`, `rounded-[22px]` — mostly in `LandingPage.tsx`). This is exactly the drift the design system doc's own opening banner calls out ("Cards 18px vs 24px drift. No more.").

**Units of work:**

1.1 Update `tailwind.config.ts` `borderRadius` extension to the doc's scale as named, semantic tokens:
   - `rounded-sm` (or keep numeric `rounded-10`, pick one convention) → **10px** — chips, tiles, tags
   - `rounded-md` / `rounded-12` → **12px** — buttons, inputs, selects
   - `rounded-lg` / `rounded-18` → **18px** — cards, panels
   - `rounded-xl` / `rounded-22` → **22px** — modals, mobile sheets
   - Full stays `rounded-full`
   - Pick names that don't collide with Tailwind's own default scale being used elsewhere (the 37 `rounded-lg` / 17 `rounded-xl` sites need to be individually checked — some may already coincidentally be correct at their default pixel value, most won't be)

1.2 Migrate the primitives first: `Button.tsx` (7→12), `Input.tsx`/`Select.tsx`/`Textarea.tsx`/`PasswordInput.tsx` (7→12), `Card.tsx` (10→18), `Modal.tsx`/`Sheet.tsx` (12→22). Once these change, every screen that composes them inherits the fix automatically — this is most of the app's surface area.

1.3 Sweep remaining inline `rounded-*` usage app-wide (the 121 `rounded-7` and 131 `rounded-10` sites that don't go through a primitive — status pills, table cells, inline buttons that predate the primitives library). Reclassify each by what it actually is (button-scale control vs card-scale surface vs chip-scale tag) rather than blindly find-replacing the number.

1.4 Fix `LandingPage.tsx`'s ad hoc radius values (`rounded-[13px]`, `rounded-[14px]`, `rounded-[20px]` → 12/12/18) so the landing page and the app are provably using the same scale, not two scales that happen to look similar.

**Phase 1 verification gate:**
- `npm run build` and lint clean
- Visual pass on Dashboard, Orders list, Order Detail, Create Order, a Modal (e.g. Cancel Order confirm), and the landing page — corners should read as a single consistent system across all of them, not "close enough"
- No visual regression — nothing should look broken, only corrected

## Phase 2 — Landing ↔ app token unification

**Goal:** Beyond radius, make sure the landing page and the app aren't independently reinventing the same values.

2.1 Audit `LandingPage.tsx` and `src/app/(legal)/*` for one-off hex colors, font sizes, and shadows that duplicate an existing Tailwind token under a different spelling (e.g. inline `rgba(26,26,26,.32)` shadows vs the app's `shadow-modal`/`shadow-sticky-top` tokens). Replace with the shared token where it's a genuine match; only keep a bespoke value where the landing page has a real reason to differ (e.g. the large-format hero gradient, which the app doesn't have an equivalent for).

2.2 Confirm the `<Wordmark>` component is what's rendering on the landing page and legal pages, not a hand-rolled inline SVG copy (the design system doc's Handoff section explicitly calls the wordmark "not text" and expects one component at every size). If the landing page has its own inline wordmark markup, replace it with `<Wordmark size="lg" />` (or the appropriate size) so a future wordmark tweak doesn't require finding every hand-copy.

2.3 Voice/tone check against §15 of the design system doc ("plain, warm, and short... no exclamation marks, no marketing") — the landing page is allowed more marketing register than the transactional app (it's selling, not operating), but headline/CTA copy shouldn't contradict the app's voice once someone signs up. This is a light editorial pass, not a rewrite.

**Phase 2 verification gate:**
- Grep for raw hex values and arbitrary shadow/spacing values in `LandingPage.tsx` and the legal pages; each surviving one should have a one-line reason it can't be a token
- Wordmark renders from the shared component everywhere

## Phase 3 — Pattern gaps

**Goal:** A short list of things the new design system doc specifies that the app doesn't have a primitive or convention for yet. Confirmed gaps only — don't go looking for more without checking against the existing primitives list first, since most of what the doc shows already has a home in `src/components/ui/` or `src/components/app/`.

3.1 **Live SMS character-count preview** (§15). Check whether this exists anywhere (it was spec'd for onboarding in the old, now-disregarded `SKILL.md`). If it doesn't exist, it's a genuinely new small feature: a live-updating message preview with a character counter that shifts neutral → amber → red at the 140/160 thresholds, matching the doc's exact copy pattern (`{{laundry}}: Hi {{first}}, ...`). Useful anywhere the app lets an admin edit laundry display name or SMS-adjacent settings.

3.2 **Destructive-modal copy discipline** (§11). Audit `ConfirmDialog` usages: does every destructive confirmation (cancel order, delete, erase) name the specific record and person, state the consequence in one line, and use a confirm button that repeats the verb ("Cancel order", not "OK" or "Confirm")? Fix copy where it doesn't.

3.3 **Toast pattern with undo** (§11). Confirm `Toast.tsx` supports an optional undo action for soft-deletable actions, matching the doc's "Order deleted. [Undo]" pattern. If it only does plain success/error messages today, extend it — this is a small, contained addition, not a new component.

3.4 **Iconography consistency** (§14). The doc specifies filled, 24px-grid icons throughout, never outline-style, never icon-only for a primary action. Spot-check a few screens for stray outline icons (common when icons get pasted in ad hoc from different sources over time) and swap to filled equivalents.

**Phase 3 verification gate:**
- Each gap above is either confirmed already covered (no work needed, note where) or closed
- No new dependency added without a one-line justification

## Phase 4 — Forward-looking: keep new features on-system

**Goal:** Since more features are coming, make it cheap to stay aligned instead of drifting again.

4.1 Add a short "component checklist" note to `src/components/ui/README.md` (which already exists and documents the primitives): before adding new inline styling to a screen, check whether `Button`/`Card`/`Modal`/`Sheet`/`Banner`/`EmptyState`/`StatusBadge` already covers it. This file is the fastest way for future-session-Claude (or Mansur) to avoid reinventing a primitive that already exists — it should stay current as primitives are touched in Phases 1–3.

4.2 No new radius, color, or shadow values get introduced outside `tailwind.config.ts`'s theme going forward — arbitrary-value classes (`rounded-[Npx]`, inline hex) are the thing this whole pass is cleaning up; reintroducing them defeats it.

## Verification, overall

- `npm run build` clean at the end of every phase
- Manual visual pass across: Dashboard, Orders list, Order Detail, Create Order, Customers, Settings, a Modal, a Sheet (mobile), the landing page, and one legal page — all should read as the same product
- Mobile viewport (390px) spot-check after Phase 1, since radius changes affect touch-target framing
- No behavioral change anywhere — this pass is tokens, primitives, and copy discipline, not new business logic (Phase 3.1's SMS preview is the one small exception, and it's additive/optional, not a change to an existing flow)

## When to stop and ask

- Before changing anything auth-related beyond visual restyling (see Resolved decisions §2)
- Before reintroducing a 5th order status or any other behavior implied by a doc mockup that conflicts with a deliberate, already-shipped product decision
- If a "token fix" would require touching more than a few lines of a service/action file — that's no longer a design-system change, stop and flag it
