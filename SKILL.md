# SKILL.md — Rinsion Frontend Wiring Pass

## Purpose

Bring the Rinsion Next.js application into full visual and behavioural alignment with the finalized design prototypes. The backend, database, service layer, and auth are complete and correct. This skill governs the frontend refactor that lays the finalized design vocabulary over that working foundation, plus the completion of prototype-specified features that were not built during the initial 12-phase implementation.

**Do not treat this as a "styling pass."** It is a design-system implementation plus a targeted feature-completion pass. Approximately 40% of the work is building shared primitives that don't currently exist, 35% is migrating existing screens to match the prototype exactly, and 25% is building features that are specified in the prototypes but were not implemented during initial development.

## Ground truth documents

Every unit of work in this skill references these documents. Read them in this order, once, at the start of the session:

1. `Brand Foundations.dc.html` — the canonical design system. Palette, typography, wordmark, empty states, component treatments, and the Handoff Notes section documenting deliberate deviations from the brief.
2. `Rinsion App.dc.html` — the five desktop hero screens as clickable prototypes.
3. `Rinsion Mobile.dc.html` — the five mobile hero screens plus four bottom sheets and one alert dialog.
4. `Rinsion Standard Screens.dc.html` — the eight standard-quality screens.
5. `Rinsion_Design_Brief.md` — the written brief that gave rise to the above. Consult for principles when the prototypes are ambiguous.
6. The five product spec documents already in the project (Business Overview, ERD, Screen Flow, Folder Structure, Technical Overview).

The prototypes are the **binding visual and behavioural specification**. Where a prototype and the written brief disagree, the prototype wins — it is the later document and has been reviewed and approved. Where the Handoff Notes section of Brand Foundations documents a deviation (currently: the Reports CSS bar charts), the deviation is intentional and must be preserved.

## What is in scope

- Tailwind theme configuration matching Brand Foundations tokens
- Public Sans loaded and actually rendering across the app
- `globals.css` cleaned up (remove Arial override, remove dead dark-mode block)
- A shared component primitives library (currently non-existent — every page renders its own markup)
- Migration of every existing page to consume the primitives and match the prototypes
- Completion of prototype-specified features that were not implemented (list in section "Feature completion inventory")
- Fixing three pre-existing bugs surfaced in the inventory: `/payments` route missing, `pickup_code CHAR(5)` vs 4-character generator mismatch, `allow_partial_payments` setting stored but never enforced
- Empty states, loading states, error states, cancelled-order states — all currently absent
- A responsive mobile pass across every screen (currently the sidebar does not collapse and there is no mobile-tab nav)
- A design-system pass on the internal `/internal/*` dashboard (styling only — see out-of-scope)

## What is out of scope

- Any change to the database schema, migrations, or RLS policies
- Any change to server actions, service layer files, or the shape of returned data (except thin wrappers where a screen needs data the service doesn't currently return in the right shape — document these explicitly)
- Auth flow changes (login, session, role redirection all stay as-is)
- Any new backend dependencies
- Adding a UI library like shadcn/ui or Radix wholesale — primitives are built to the design specification, not imported from a library. Individual Radix packages (e.g. `@radix-ui/react-dialog` for accessibility scaffolding under a custom-styled modal) are acceptable when justified in the narration
- Redesigning the internal dashboard flows. `/internal/*` gets a **styling** pass — same layouts, same data, same interactions, but with the primitives and typography. The internal dashboard is an operator tool, not a customer surface; do not rebuild it to prototype standards it was never held to
- The Product B customer-facing surface (the `allow_customer_submissions` setting stays as-is — a stored toggle that nothing reads)
- New dependencies without narrating the justification and getting a verification gate before installing

## Rules of engagement

1. **Read the relevant prototype block before writing any component.** If migrating the Dashboard, open `Rinsion App.dc.html`, find the Dashboard section, read its markup. If building the Record Payment modal, open both the desktop prototype and the mobile bottom sheet. Do not proceed from memory.

2. **Follow the prototype markup as ground truth.** This is Option A wiring — the prototypes are the design specification. Do not "improve" spacing, colours, radii, or hierarchy while porting. If a prototype has 14px padding and 12px radius, the port has 14px padding and 12px radius. Deviations require narration and a verification gate.

3. **No inline styles.** The prototypes use inline styles because they are static HTML files. The Next.js port uses Tailwind classes only. Where a value doesn't map to a Tailwind utility, extend the Tailwind theme rather than escape-hatching to inline styles. The one currently-permitted inline style pattern (`style={{ width: \`${pct}%\` }}` for progress bars) is fine to keep.

4. **Narrate before, during, and after each unit of work.** Same rule as the initial build. Explain what is about to be done, why, which prototype file and section are being consulted, and what the acceptance test is.

5. **Verification gate at the end of every screen.** Before moving to the next screen, produce a side-by-side comparison: prototype markup vs. rendered Next.js output. If any difference exists that isn't explicitly justified in narration, fix it before moving on.

6. **Do not touch the service layer's shape.** If a screen needs data the service doesn't currently return, add a thin wrapper service that composes existing services rather than modifying them. Document the wrapper's existence and reason.

7. **Preserve all existing correct behaviour.** Any working feature stays working. Any working data flow stays intact. If a refactor breaks a test path, restore it before moving on.

## Phase structure

Four phases, each with a hard verification gate before proceeding.

---

### Phase 1 — Foundation and pre-existing bug fixes

**Goal:** Get the design tokens into Tailwind, get Public Sans rendering, fix the three latent bugs, and clean up dead code. No visual work on any screen yet.

**Units of work:**

1.1 **Tailwind theme extension.** Read Brand Foundations for the canonical values. Extend the Tailwind theme with:
- Colours: primary emerald palette (`#0F3D2E` and shade steps), clay accent (`#C25A3C` and shades), warm off-white background (`#FAF8F5`), warm surface tints (`#F4F0EA`, `#F1ECE4`, `#EAF2EE`, etc.), charcoal text (`#1A1A1A`), muted text stops (`#43403B`, `#6B6259`, `#9A9088`), border tokens (`#E8E4DD`, `#CDC7BD`), status colours (received grey, confirmed blue, processing amber, ready emerald, collected muted, cancelled muted red), and functional colours (`#B0413A` muted error, warning amber, success green-tint)
- Font family: Public Sans with a system-ui fallback stack
- Font sizes: match the prototype scale (display 32-48, h1 24-28, h2 18-20, body 15-16, label 13-14, caption 12-13)
- Font weights: 400, 500, 600, 700, 800 (the wordmark uses 800)
- Border radii: extend to include the 6, 7, 8, 9, 10, 11, 12 range the prototypes actually use. Do not add any radius above 12px. Do not add radius tokens for pills — pills use `rounded-full`
- Letter spacing: `-0.045em` (wordmark), `-0.02em` (headings), `0.06-0.16em` (labels and uppercase eyebrows)
- No shadows in the theme. Elevation is expressed as background tint shifts and 1px borders. The one exception is the sticky Create Order summary footer, which uses a subtle top-only shadow — extend the theme with a single named shadow for this if needed

1.2 **`globals.css` cleanup.**
- Remove the `body { font-family: Arial, Helvetica, sans-serif; }` override — this is currently swallowing the Geist fonts and would swallow Public Sans too
- Remove the entire dark-mode `@media (prefers-color-scheme: dark)` block — light mode only per the brief
- Remove the `--background` and `--foreground` CSS variables — they exist only to serve the dark mode block being removed
- Add a `.tnum` utility class for tabular numerals: `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: 'tnum' 1, 'lnum' 1;` — the prototypes use this class extensively
- Keep the `.text-balance` utility

1.3 **Public Sans loading.** In the root `layout.tsx`:
- Remove the `localFont` calls for `GeistVF.woff` and `GeistMonoVF.woff`
- Remove the Geist font files from `src/app/fonts/` if they are no longer imported anywhere
- Add Public Sans via `next/font/google`: weights 400, 500, 600, 700, 800, with the CSS variable pattern
- Apply the font as the default sans on `<body>` via the Tailwind theme's `fontFamily.sans` extension so `font-sans` and unadorned text both use Public Sans

1.4 **Fix the `/payments` route.** The sidebar links to `/payments` for both admin and employee roles, and the route does not exist. Create `src/app/(app)/payments/page.tsx` as a Server Component that renders the Payments list per `Rinsion Standard Screens.dc.html`'s Payments section. This screen will be fully styled in Phase 4, but at minimum in Phase 1 it must exist and not 404. A functional list with title, empty state, and correct data fetch via a new `getPayments` service (or an existing one that returns the right shape) is acceptable as the Phase 1 stub.

1.5 **Fix the pickup code length mismatch.** The database column is `pickup_code CHAR(5)` but `src/utils/generatePickupCode.ts` produces 4 characters. The Business Overview specifies **5-digit numeric** pickup codes. Fix the generator to produce 5 numeric digits, matching the spec. Do not change the database column. Verify `verifyAndCollect` still works after the fix — its comparison logic may have been tolerating a padded 4-char code with `.ilike`, which will still work correctly with a proper 5-char code.

1.6 **Enforce `allow_partial_payments`.** The setting is stored, the toggle exists in the UI, but `createOrder`, `recordPayment`, and `verifyAndCollect` never read it. When the setting is `false`, a payment for less than the outstanding balance must be rejected with a clear error message ("This laundry requires full payment. Enter the full outstanding balance of GHS X."). Add the check to `recordPayment` service. Do not change the service signature; return the error via the existing error path.

1.7 **Delete the empty placeholder directories.** `components/buttons/`, `components/forms/`, `components/layout/`, `components/modals/`, `components/navigation/`, `components/subscription/`, `components/tables/` currently contain only `.gitkeep` files. Delete them. Phase 2 introduces the actual structure.

**Phase 1 verification gate:**
- `npm run build` passes clean
- `npm run typecheck` passes clean
- Visual regression check: open any page in the browser. Text is rendering in Public Sans. Text is not rendering in Arial or Geist. No page is worse-looking than before Phase 1 (nothing has been restyled yet, but nothing should be broken)
- `/payments` returns 200, not 404
- Create a test order and generate a pickup code. Verify the code is 5 digits.
- Toggle `allow_partial_payments` to false on a test laundry, attempt a partial payment, verify it is rejected

---

### Phase 2 — Primitives library

**Goal:** Build the shared component primitives that the codebase does not currently have. Every subsequent phase consumes these; no phase after this creates ad-hoc versions of anything on this list.

**Location:** `src/components/ui/` for pure design primitives. `src/components/app/` for domain-specific composites (e.g., `<StatusBadge>`, `<PickupCodeChip>`, `<StatCard>`, `<Wordmark>`).

**Reading order:** For each primitive, read the corresponding block in Brand Foundations first. Brand Foundations has canonical treatments for most of these; the prototypes show them in context.

**Primitives to build:**

2.1 **`<Wordmark>`.** The Rinsion wordmark from Brand Foundations — Public Sans 800 with the custom "i" letterforms (emerald tittles, charcoal stems) and the notched "o" ring. Props: `size` (`sm | md | lg` mapping to top-bar 21px, hero 42px, marketing 96px), `variant` (default | reversed for dark backgrounds — used on Order Detail mobile's emerald header). The wordmark **is not text**. Render each letter as inline-block with the custom "i" and "o" as inner components so the "o" and dots stay proportional at every size.

2.2 **`<OMark>`.** The notched-ring "o" in isolation. Props: `size`, `variant` (`default | reversed | muted-red` for lockout state), `spinning` (boolean — animates via CSS keyframe when true). This one component powers: the loading spinner, the pickup-code frame, the empty-state graphic (composed with concentric rings), the icon in the prototype ribbon, and the subscription lockout hero mark.

2.3 **`<PickupCodeChip>`.** The pickup-code "moment" from Order Detail. Props: `code`, `size` (`sm` for dashboard list rows and small contexts — renders as tabular text with a "PICKUP CODE" label, no ring; `lg` for Order Detail — renders the code inside a thin "o" ring at 128px). This is the split treatment from the desktop hero pass — the small ring was replaced with plain tabular text because the notch became invisible at 42px.

2.4 **`<Button>`.** Variants: `primary` (emerald), `accent` (clay — reserved for high-value actions per Brand Foundations: Mark Collected, Record Payment, and equivalents only), `secondary` (white with border), `ghost` (transparent), `destructive` (muted red text on white — for Cancel Order inside the More menu). Sizes: `sm`, `md`, `lg`. Loading state via `isPending` prop that swaps content for a small spinning `<OMark>`. Disabled state. `asChild` prop is not required; if it becomes necessary later add it with Radix Slot at that time.

2.5 **`<Input>`, `<Select>`, `<Textarea>`.** Standard form primitives. Focus ring in emerald with 3px soft glow (matches `.rin-field:focus` in the prototypes). Native `<select>` with the custom chevron overlay from the prototype markup — do not build a custom dropdown component unless a feature (like the Create Order line-item selectors) explicitly requires searchability. The existing `CustomSelect` in `CreateOrderForm.tsx` will be replaced during the Create Order migration; do not port it to the primitives.

2.6 **`<Card>`.** White surface, warm off-white border, 12px radius. No shadow. Optional header slot, optional footer slot. Padding tokens: `p-4`, `p-5`, `p-6` map to the prototype's common values.

2.7 **`<Table>` primitives.** `<DataTable>` with header row, body row, and hover state (`bg-[#FBFAF7]` on hover — matches the prototype's `.rin-row:hover`). Column configuration via a `columns` prop. Support the grid-based layout the prototypes use (each row is a `display: grid` with `grid-template-columns` per screen) rather than semantic `<table>` if that maps more cleanly. Both are acceptable — pick one and use it consistently. Include the "Nothing to show" empty state as a slot that can be overridden per screen.

2.8 **`<StatusBadge>`.** Consumes an order status enum, renders the pill with the correct status colour + text + coloured dot. This centralises the four inline copies currently in the codebase. Status colour mapping from Brand Foundations.

2.9 **`<StatCard>`.** Consumes a label, a value (accepts a string or a number to be formatted), and an optional delta with colour. Value renders in tabular figures. Replaces the four independent copies.

2.10 **`<EmptyState>`.** The abstract "o + concentric rings" mark plus headline, body copy, and optional primary action. Props: `title`, `body`, `action` (a `<Button>`), `variant` (`default` for lists, `caught-up` for the "All caught up" state on the dashboard).

2.11 **`<Modal>` and `<Sheet>`.** Modal for desktop, Sheet for mobile bottom sheets. Both share a `useDismissable` hook (Esc to close, backdrop click to close, focus trap, `aria-modal`). Modal is centred. Sheet slides up from the bottom with the `sheet-up` keyframe from the prototypes. Both accept a header, body, and footer. Radix `@radix-ui/react-dialog` is acceptable as the accessibility scaffold under a custom-styled surface — narrate the decision to install it.

2.12 **`<Pagination>`.** Numbered pagination on desktop, "Load more" on mobile below 720px viewport. Uses the exact CSS switch pattern from the standard screens file (`.rin-pager` and `.rin-loadmore` classes with a `@media (max-width: 720px)` swap). Props: `total`, `pageSize`, `currentPage`, `onPageChange`, `onLoadMore`.

2.13 **`<Banner>`.** For the SMS quota warning, the subscription grace-period warnings, the post-onboarding "You're all set up" banner, and any other inline status message. Variants: `info`, `warning`, `success`, `destructive`. Dismissable prop.

2.14 **`<CommandPalette>`.** `Cmd/Ctrl+K` opens a search dialog with fuzzy-matched actions ("Create order", "Search customer Ama", "Go to Pricing"). Uses `cmdk` package (justify the dependency in narration — it's the standard tool for this). The palette is a power-user layer per the brief; do not spend disproportionate time on it. A minimal implementation with the four or five most common actions is acceptable for launch.

2.15 **`<GlobalSearch>`.** The top-bar search input with a "/" keyboard shortcut hint. Focusing on "/" routes to the input. On submit, routes to `/orders?q=…` (or `/customers?q=…` — the prototype's search covers both; the target route is orders per the current spec). Debounced.

2.16 **`<Spinner>`.** Alias for `<OMark spinning>` for readability at call sites. Same component.

2.17 **`<Toast>`.** Success and error toasts appearing at the top-right. `sonner` is the recommended dependency (small, unopinionated, standard). Use for success confirmations (payment recorded, order created) where the prototype's flow implies a lightweight confirmation and the screen otherwise doesn't change state visibly.

**Phase 2 verification gate:**
- Every primitive has a corresponding entry in a documentation file (`src/components/ui/README.md`) with a one-line description, its props, and a link to the prototype block it derives from
- Every primitive renders in isolation — a Storybook file is not required, but the primitive must be importable and rendered on a temporary `/dev/primitives` route (which is deleted before Phase 3 begins)
- `npm run build` and `npm run typecheck` clean
- The four `StatCard` clones and the various inline `Field`, `StatusBadge`, and `Card` definitions are still in place — Phase 3 removes them screen by screen

---

### Phase 3 — Hero screen migration and feature completion

**Goal:** Migrate the five hero screens to consume the primitives library and match their prototypes exactly. Build the prototype-specified features that are currently missing on those screens.

**Order of screens:** Migrate in this order so that the highest-value screens land first and any friction with the primitives is discovered early.

3.1 **Dashboard** (`src/app/(app)/dashboard/page.tsx`)
- Replace the six-stat-card layout with the prototype's "lead with Ready for collection" hero list plus secondary stats
- Wire the "All caught up" empty state via `<EmptyState variant="caught-up">`
- Add the SMS overage soft warning banner (admin-only) using `<Banner variant="warning">` — the trigger and copy come from `computeSmsUsage`
- Add the post-onboarding "You're all set up" dismissible banner. State: check whether the current laundry has ever created an order; if not and setup is complete, show the banner. Dismissal persists per-user (a small `dismissed_banners` array in a user preferences model — if this doesn't exist, dismissal can be session-only for launch)
- Add the subscription lockout **full-page** state per the prototype. Currently lockout is a top-of-page banner and the app remains navigable. Change this: when subscription status is `hard_block` or `locked`, render the lockout page instead of the dashboard content and hide the sidebar nav. This is a **behavioural** change to a screen, not just styling — narrate it. The "o" in muted red, headline, restoration copy, "Pay now" and "Contact support" buttons per the prototype
- Employee variant: filter Ready orders by employee's branch (already spec'd — enforce it), hide the SMS banner and financial stats
- Add the "Mark Collected" inline action per row of the Ready list. Clicking opens `<Modal>` for pickup-code verification. Reuses the modal component from Phase 2
- Reference: `Rinsion App.dc.html` Dashboard section, `Rinsion Mobile.dc.html` Dashboard section for the mobile variant

3.2 **Create Order** (`src/app/(app)/orders/new/`)
- Replace the entire `CreateOrderForm.tsx` with a new implementation. This is the most-used screen in the product and needs to match the prototype precisely
- Priority is a segmented control (Normal / Express / Urgent), not a dropdown. Currently a `CustomSelect`
- Line items are cards on mobile, table rows on desktop. Both variants recompute unit price + line total + subtotal live per the current implementation — preserve this
- Customer block: if a customer is preselected via URL param (`?customerId=…` when creating from Customer Detail), render the customer at the top with a "Change" link; otherwise show the search + recent + add-new state per the mobile prototype's `createNoCustomer` view
- Sticky summary footer on both desktop and mobile with subtotal in tabular figures
- Notes field remains (was correct in the initial build)
- Reference: `Rinsion App.dc.html` Create Order, `Rinsion Mobile.dc.html` Create Order

3.3 **Order Detail** (`src/app/(app)/orders/[id]/`)
- Dark emerald header on mobile with the pickup-code "o" ring and 36px tabular code. On desktop, the header is warm off-white with the same pickup-code moment on the right
- Horizontal stepper on desktop, vertical stepper on mobile, showing all six statuses (Received → Confirmed → Processing → Ready → Collected). Cancelled orders render the **broken stepper** state: "Received — — — Cancelled at {status}" with a dashed line
- Cancelled state: read-only banner explaining who cancelled and when, action bar collapsed (no Update Status, no Mark Collected, no Record Payment), pickup code hidden, activity history forced open as the audit trail
- Action bar: primary actions Mark Collected (opens code-verification modal — this is currently the closest existing pattern, ported to `<Modal>`), Record Payment (opens `<Modal>` on desktop, `<Sheet>` on mobile with live "balance after payment" computation), Edit Order (routes to a future edit flow — for launch, this can be a stub button), More ▾ dropdown containing Cancel Order in muted red text
- Add-note affordance at the bottom of the Notes block — inline text field with a Save note button. Wires to a new `createOrderNote` service action; no existing service does this, so add one. This is a documented service-layer addition
- Payment summary block with total due / amount paid / outstanding balance. If outstanding > 0, the "Record Payment" action is prominent
- Activity history collapsible by default; forced open for cancelled orders
- Resend SMS moves inside the Mark Collected modal (not standalone on the sidebar as it currently is)
- Reference: `Rinsion App.dc.html` Order Detail, `Rinsion Mobile.dc.html` Order Detail (both active and cancelled variants)

3.4 **Pricing Matrix** (`src/app/(app)/items-and-services/`)
- Desktop: true grid — item types down, services across, priced cells show the amount in tabular figures, empty cells show "+ Set" in soft-grey with a hover state
- Inline cell edit is already implemented correctly (`ItemsServicesClient.tsx:239–247`) — preserve the Enter/Escape/blur behaviour, restyle to match the prototype
- Mobile: expandable list — one card per item type, tap to expand and see all services with their prices. Tapping a cell opens the price `<Sheet>` for editing. Reuses the `commitPriceSheet` handler pattern from the mobile prototype
- Empty state when no item types exist: `<EmptyState>` with "Add your first item type" primary action
- Reference: `Rinsion App.dc.html` Pricing Matrix, `Rinsion Mobile.dc.html` Pricing

3.5 **First-Run Setup** — **new screen, does not currently exist.**
- Route: `src/app/(app)/onboarding/page.tsx`
- Show this screen when a newly-invited admin logs in for the first time and their laundry has no item types, services, or completed setup. Detection logic: check the trial state and whether the laundry has any `item_types` and any `settings` beyond the row's creation defaults. If those conditions are met and this is the admin, redirect to `/onboarding` before the dashboard
- Three-step wizard per the prototype: Laundry & branches → Services → Pricing
- Live SMS preview with character counter on step 1 — as the admin types the laundry display name, the mock SMS body updates and the count colour shifts from neutral to amber to red as it crosses the 160-character threshold
- Step 1 is not skippable (canSkip: step > 1). Steps 2 and 3 are skippable
- On completion, redirect to the dashboard with the "You're all set up" banner visible
- This is a **new feature**, not a migration. Narrate the plan before starting: service dependencies (needs to create initial `item_types`, `services`, and `item_service_prices`), state model (form data across three steps), routing
- Reference: `Rinsion App.dc.html` First-Run Setup, `Rinsion Mobile.dc.html` Onboarding

**Phase 3 verification gate:**
- Every hero screen renders side-by-side comparable to its prototype. Any deviation is either narrated and justified or fixed
- The five bullet-pointed missing features (priority pills, cancelled state, add-note, first-run wizard, subscription lockout as full page) are complete and testable end-to-end
- `npm run build` and `npm run typecheck` clean
- Employee vs admin variants of Dashboard both render correctly under role switching
- Mobile viewport (390px width) renders each hero screen without horizontal scroll and with the correct card / sheet / vertical stepper treatment
- Ready for Phase 4

---

### Phase 4 — Standard screens, missing features, and passes

**Goal:** Fill in everything else. The standard screens migration, the remaining feature completions, the mobile responsive pass, the internal dashboard styling pass, empty states across the app.

**Order does not matter within Phase 4** — pick the highest-value work first. Suggested order below.

4.1 **Standard screens migration.** For each of Orders list, Customers list, Customer Detail, Payments list, Team (employees), Items & Services list views, Settings, Reports:
- Migrate to consume the primitives
- Add the numbered-desktop / load-more-mobile pagination pattern via `<Pagination>`
- Add the empty-results state via `<EmptyState>`
- Add the admin-restricted state to Team, Items, Settings, Reports (currently these silently redirect non-admins — replace with the "Admin access only" card per the prototype, with a hint to switch role in the ribbon during development)
- Orders list: add the branch filter dropdown (admin only) — this is a currently-missing filter. Consumes existing services with a small addition of a `branchId` parameter to `getOrders` (thin service change, narrate it)
- Reports: preserve the CSS bar charts per the Handoff Notes in Brand Foundations. **Do not** convert them to plain tables. The three charts (revenue this week, revenue by branch, orders by status) plus the employee activity table are the deliverable
- Reference: `Rinsion Standard Screens.dc.html` for each

4.2 **Payments screen build-out.** Phase 1 created a stub. Now build it out fully per the Payments prototype:
- Three summary cards (Collected today, Collected this week, Outstanding balance) in tabular figures. Outstanding in muted red
- Filter bar: search, method dropdown, date range pill (visual — the date range is a decorative pill in the prototype; a real date picker is optional for launch and can be a follow-up)
- Table with receipt, date, order, customer, method, amount, recorded-by columns
- Consumes a new `getPayments(laundryId, filters)` service. Currently no such service exists (the initial build never created the Payments list). Narrate the service addition

4.3 **Global search and command palette.**
- Global search in the top bar (`<GlobalSearch>` from Phase 2). Focus on "/" routes there. Submit routes to `/orders?q=…`
- Command palette (`<CommandPalette>` from Phase 2) opens on Cmd/Ctrl+K. Actions: Create order, Search customer, Go to Orders, Go to Customers, Go to Pricing, Go to Reports, Go to Settings, Sign out. Fuzzy match
- Both are power-user layers; the brief explicitly says they should be discoverable but not in the way

4.4 **Cross-screen empty states.** Every list screen (Customers, Orders, Payments, Team, Items, Services, item types within Pricing) needs an `<EmptyState>` treatment. Copy per the prototype: "No orders yet — new orders will appear here as employees create them", etc.

4.5 **Loading states.** Wire `<Suspense>` with `<Spinner>` (the "o") on server-component pages where the initial render currently blocks. `loading.tsx` files at the appropriate route levels. Do not build skeleton loaders — the brief forbids them; the "o" spinner is the loading vocabulary

4.6 **Error and 404 states.** Add `error.tsx` and `not-found.tsx` at the root of the `(app)` route group. Warm off-white background, the "o" mark in muted grey, a plain message, a link back to Dashboard. Do not use humor or emojis

4.7 **Mobile responsive pass.** Currently the sidebar is `w-56 flex-shrink-0 h-screen sticky top-0` and does not collapse on narrow viewports. Replace with a responsive shell:
- Above 720px: sidebar as-is (restyled to match the prototype's desktop app shell)
- Below 720px: sidebar hidden, bottom tab bar (Dashboard / Orders / Customers / Payments / More) visible. FAB on the Dashboard screen only
- The mobile prototype's bottom tab bar and FAB implementation is the reference

4.8 **Internal dashboard styling pass.** `/internal/*` gets a styling-only pass:
- Primitives applied throughout (Card, Button, StatusBadge)
- Public Sans, warm off-white background, correct type scale
- Wordmark: "Rinsion Internal" — same wordmark component with a small "Internal" label beside it
- Do not restructure any internal page's data flow or UX. The internal dashboard is an operator tool built to a different (lower-visual, higher-density) bar
- Fix the layout inconsistency: `internal/laundries` and `internal/create-laundry` currently use their own `<main>` layouts and look disconnected from the rest of the internal dashboard. Bring them inside the standard internal layout shell

4.9 **Priority pills conditional.** The `allow_express_orders` setting exists. When it is `false`, the priority pills on Create Order do not render — the order defaults to Normal invisibly. Currently the priority `CustomSelect` shows regardless of the setting. Wire the conditional

4.10 **Subscription banners cleanup.** Phase 3 moved the lockout state to a full page. Also review the soft-block and hard-block banners currently in `src/app/(app)/layout.tsx:19-26` and restyle them via `<Banner>` primitive. Hard-block escalates but is still a banner, not a full page (only lockout is the full-page treatment per the prototype's hierarchy)

4.11 **Currency and date formatting audit.** Every currency display must be `GHS 90.00` format in tabular figures. Every date must be `28 June 2026` format (or compact `28 Jun 2026` in tight columns). Grep the codebase and fix any format that drifts

4.12 **Wordmark audit.** Grep for the string `"Rinsion"` and every occurrence must be either the `<Wordmark>` component (visual) or an accessible text string in `aria-label` / page titles / metadata. The plain-text `<p>Rinsion</p>` in `Sidebar.tsx:9` and elsewhere is replaced

**Phase 4 verification gate:**
- Every screen in the app has been visited during verification, either restyled or intentionally deferred with narration
- `/payments` renders the full Payments screen matching the prototype
- Mobile viewport (390px) navigates entirely via the bottom tab bar; sidebar is not visible
- `Cmd+K` opens the command palette; `/` focuses global search
- Reports still has its three bar charts
- All empty states, error states, and 404 states use the design vocabulary
- Currency, date, wordmark audits complete with no drift
- `npm run build` and `npm run typecheck` clean
- Ready for launch

---

## Feature completion inventory

Reference list of features specified by the prototypes that were not built during the initial 12-phase implementation. Each is addressed in a specific phase above; this section exists as a checklist.

| Feature | Phase | Notes |
|---|---|---|
| Priority pills (segmented control) | 3.2 | Currently a `CustomSelect` dropdown |
| Live SMS character-count preview | 3.5 | Part of the first-run wizard |
| Live balance-after-payment in Record Payment | 3.3 | Currently balance is not shown as a live computation |
| Command palette (Cmd/Ctrl+K) | 4.3 | New primitive, wired in top-bar |
| Global search with `/` shortcut | 4.3 | New primitive, wired in top-bar |
| Bottom-tab mobile navigation | 4.7 | Part of the mobile responsive pass |
| Bottom sheets on mobile | 2.11 → used from 3.3, 3.4 | Primitive built in Phase 2 |
| Mark Collected confirmation modal with pickup-code verification | 3.3 | Currently inline panel with `useState` collect step |
| Resend SMS inside the collect modal | 3.3 | Currently a standalone button in the Order Detail sidebar |
| Order Detail cancelled state | 3.3 | Currently renders like any other status |
| Numbered pagination + Load more | 2.12 → used across 4.1 | Primitive built in Phase 2, applied in Phase 4 |
| Abstract "o + rings" empty states | 2.10 → used everywhere | Primitive built in Phase 2 |
| Subscription lockout as full page | 3.1 | Currently a top-of-page banner |
| Post-onboarding "You're all set up" banner | 3.1 | Depends on 3.5 (onboarding flow) |
| Vertical stepper on mobile Order Detail | 3.3 | Part of Order Detail migration |
| Expandable pricing on mobile | 3.4 | Part of Pricing migration |
| Add-note affordance on Order Detail | 3.3 | Requires new `createOrderNote` service |
| "More ▾" dropdown for Cancel Order | 3.3 | Part of Order Detail action bar |
| Branch filter on Orders list | 4.1 | Requires `branchId` addition to `getOrders` |
| Admin-restricted states with hint card | 4.1 | Replaces the current silent redirect |
| `allow_partial_payments` enforcement | 1.6 | Backend enforcement (Phase 1 bug fix) |
| `allow_express_orders` conditional on priority pills | 4.9 | UI conditional |
| First-run onboarding wizard | 3.5 | Fully new feature |
| `/payments` route | 1.4 → 4.2 | Stub in Phase 1, full build-out in Phase 4 |
| Loading spinners (the "o") | 2.16, 4.5 | Primitive in Phase 2, applied via Suspense in Phase 4 |
| Error + 404 pages | 4.6 | New |

## Handling ambiguity

When a prototype block is unclear or the two prototypes (desktop and mobile) disagree on a detail:

1. Re-read the block in both prototypes and in Brand Foundations
2. If still unclear, consult the written brief (`Rinsion_Design_Brief.md`) for the underlying principle
3. If still unclear, make the smaller decision — the one that is easier to reverse
4. Narrate the ambiguity and the decision at the point of decision, not in a summary at the end
5. Never invent a design pattern that has no reference in the prototypes, brief, or Brand Foundations

## When to stop and ask

Stop and ask Mansur when:

- A service layer change is needed that is not a thin composition wrapper (e.g., changing the shape of an existing service's return value)
- A new backend behaviour is needed that is not documented in the specs (e.g., a filter that requires a new table column)
- The prototype implies a UX that meaningfully changes an existing working flow beyond styling (e.g., the subscription lockout full-page change in 3.1 — this is called out as a behavioural change and the phase description narrates it; equivalent changes that are not already narrated require a checkpoint)
- A new dependency is needed and the justification is not obvious (small utilities are fine; a large framework or UI kit needs a checkpoint)
- Verification gates repeatedly fail on the same issue — three attempts and no clear path forward is a checkpoint

Do not stop and ask for:

- Small ambiguities that can be resolved by re-reading the prototype
- Choosing between two equally-valid Tailwind class strings
- Whether to name a component `<Foo>` or `<FooBar>` — pick one
- Filing bugs found in the current codebase that are trivial (fix them and narrate)

## Verification and quality

- `npm run build` clean before every phase gate
- `npm run typecheck` clean before every phase gate
- Manual side-by-side comparison against the prototype at the end of each screen migration
- Mobile viewport check (390px) at the end of every screen migration in Phase 3 and 4
- Role switching (admin ↔ employee) at the end of every screen that differs by role
- No `console.log` left in shipped code
- No commented-out code left in shipped files (comments explaining intent are welcome; commented-out prior implementations are not)

## End state

When Phase 4's gate passes, the app is ready to hand to Mansur for validation interviews. The design system is complete, the prototypes are faithfully implemented, the pre-existing bugs are fixed, and every prototype-specified feature is present and working. The internal dashboard is styled but structurally intact.

The next work after this skill is out of scope: Paystack integration, Vercel Pro migration, Product B, and any post-interview iterations. Those are their own workstreams.
