# **Rinsion**

## **Design Brief for Claude Design**

### **Version**

V1 Design Brief

### **Status**

Ready for Design Phase

### **Scope**

Product A — Admin & Employee operations platform (web + mobile responsive), light mode only. Landing page, dark mode, and Product B (customer-facing) are out of scope for this brief.

---

# **1. What Rinsion Is**

Rinsion is a B2B SaaS platform for laundry businesses in Ghana. It replaces paper notebooks, receipt books, and WhatsApp chains with a centralised digital system that tracks customer orders, garment processing, payments, and employee accountability.

The platform is used by two roles:

- **Admins** — laundry owners. Manage employees, pricing, settings, branches, and have full visibility across the business.
- **Employees** — staff who run day-to-day operations. Create orders, update statuses, record payments, process pickups.

The full product specification lives in five reference documents: Business Overview, Database Diagram, Screen Flow, Folder Structure, and Technical Overview. **Read those before designing.** This brief covers the visual and experiential layer on top of that spec — not the product logic itself.

---

# **2. The North Star**

When a Ghanaian laundry owner sees Rinsion for the first time, the response we want is:

> **"This looks like it was made for us."**

Not "expensive." Not "advanced." Not "easy" alone. *Made for us.* That word — *us* — is the design target. Every choice should answer to it: does this feel built for a Ghanaian laundry owner, or does it feel like a generic SaaS template we've borrowed from Silicon Valley?

The product is for a market that has been chronically under-served by software design. Most tools either feel imported (Western SaaS that doesn't fit local rhythm) or improvised (WhatsApp + Excel). Rinsion's design opportunity is to be *globally polished and locally rooted at the same time* — sharp enough to feel premium, warm enough to feel like home.

---

# **3. Brand Personality**

Three adjectives, in order of weight:

1. **Sharp** — typography is crisp, spacing is intentional, edges feel precise, nothing looks accidental.
2. **Modern** — feels contemporary, not dated; aware of current design language without chasing trends.
3. **On top of its affairs** — the product itself feels competent. Looking at the screen makes the owner feel more in control of their business, not less.

What this is **not**: cute, friendly, playful, edgy, futuristic, luxurious, minimal-to-the-point-of-empty, or maximalist.

---

# **4. Local Positioning**

The design should sit somewhere between **globally polished with subtle West African cues** and **proudly, unmistakably Ghanaian** — closer to the latter.

What this means concretely:

- The Ghanaian feel lives in **palette warmth, illustration choices, and tone of voice** — not in literal cultural motifs (no kente patterns, no adinkra symbols, no overt national imagery).
- Photography (when used) should feature Ghanaian people, Ghanaian shops, Ghanaian materials. Never stock photography of smiling people in matching aprons.
- Currency, date formats, phone number formats, and microcopy are all Ghana-defaults from day one. No `$` symbols, no `MM/DD/YYYY` dates.
- Copy is **all English**. No Twi or pidgin in the UI. (The shops themselves are bilingual, but the software should remain professional English so it works across all regions of Ghana and supports future expansion.)

The goal: a Ghanaian owner looks at Rinsion and feels recognised. A non-Ghanaian visitor looks at Rinsion and senses they're in a specific place — they can't quite tell where, but it isn't San Francisco.

---

# **5. Visual Direction**

## **References to draw from**

- **Hubtel** — local credibility, familiar to the market.
- **Paystack** — clean, considered, trustworthy. The standard for African fintech polish.
- **mNotify** — local, operational, no-nonsense.
- **saazai.framer.website** — the aesthetic direction; modern, intentional, distinctive.

## **References to actively avoid**

- **Salesforce / SAP** — dense, cluttered, exhausting. Power-tool aesthetic that punishes the user.
- **Generic Material Design starter kits** — every button blue, every empty state the same cartoon, looks unfinished even when finished.
- **Crypto / AI startup aesthetic** — gradients, glassmorphism, dark purple/black with neon accents. Trying too hard.
- **Over-friendly consumer app feel** — emojis in UI, "Yay! 🎉 Order created!", baby-blue everywhere. Doesn't match a serious operational tool.
- **Bootstrap admin template look** — sidebar + chart cards + grey tables, indistinguishable from 10,000 other dashboards. (See "Distinctiveness Principles" below for the antidote.)
- **Tally / Notion clutter** — too many buttons, unclear where the user should go next.

## **Distinctiveness Principles**

The Bootstrap admin look isn't about layout — it's about a lack of intent. The antidote:

- **Hierarchy that reflects the work, not the data.** Don't show six equal-sized stat cards. Lead with what needs attention ("12 orders ready for collection") and demote the rest.
- **Tables that breathe and emphasise.** Same data, but customer names heavier than order IDs. Overdue payments glow softly. Status badges actually catch the eye. Bootstrap tables are uniform grey; ours have rhythm.
- **One signature element per surface.** A characteristic empty state, a distinct way of showing status transitions, a unique pickup code display. Small things that make a screenshot of Rinsion identifiable without a logo.

---

# **6. The Wordmark (To Be Designed)**

Rinsion does not yet have a logo. Producing one is part of this brief.

## **Hard constraints**

- **Wordmark only.** No accompanying mark or icon at launch. The wordmark itself must work at all scales.
- **Title case** — "Rinsion", not "rinsion" or "RINSION".
- **The "o" must be designed to stand alone.** When extracted from the wordmark, it must be immediately recognisable as Rinsion. This is the single most important constraint on the wordmark. A plain "o" pulled from a generic sans-serif font is a circle — any product can claim a circle. The "o" needs a distinct treatment — a custom curve, a heavier weight than the surrounding letters, an inner detail, a colour break, or some other intentional element — built into the wordmark from the start.

## **Why the "o" is special**

The "o" is the brand's living element. It does multiple jobs across the product:

1. **It is the icon.** When Rinsion needs to appear small — favicon, mobile app icon, social avatar, browser tab — the "o" stands alone as the mark. Same shape as in the wordmark, isolated.
2. **It is the loading spinner.** When the system is loading, the "o" lifts off the page and spins. Not a generic spinner — *our* "o".
3. **It frames status.** Status badges use a small filled "o" before the label (`● Ready`, `● Processing`). The "o" becomes a vocabulary element.
4. **It frames pickup codes.** On receipts and order details, the 5-digit pickup code can be presented inside a thin "o" ring.

One shape, many jobs. That's how the wordmark earns its keep.

## **Etymology context**

"Rinsion" evokes *rinse* without being a dictionary word. Short, memorable, software-product cadence. The wordmark should feel modern and self-contained — not nostalgic, not tied to "laundry" imagery literally (no suds, no water drops, no bubbles).

## **What the wordmark must work on**

- Mobile app icon (1024×1024)
- Favicon (16×16, 32×32)
- Top-left of every web screen (small, ~24px height)
- White background (primary use case)
- Printed in black on white (future receipts)

Deliverables: full wordmark, "o" mark in isolation, and the spinner animation reference.

---

# **7. Colour Palette**

## **Primary**

**Deep emerald.** A confident, grounded green. Not Spotify green (too consumer), not WhatsApp green (too messaging), not olive (too earthy). Closer to a deep forest emerald — roughly the `#0F3D2E` range, to be tuned by Claude Design.

Reads as: serious, grounded, growing, trustworthy. A colour you can build a business on without it shouting.

## **Accent**

**Clay / terracotta.** A warm secondary for highlights, key actions, and emotionally important moments. Roughly the `#C25A3C` range, to be tuned.

Reads as: warm, Ghanaian, grounded in earth and brick. The accent is *sparingly used* — it earns attention because it's rare. Don't use it on every primary button; use it on the moments that matter (the "Mark Collected" action, the celebratory "Ready" status when it lands).

Clay was chosen over gold deliberately. Gold reads as aspirational / luxury / "expensive" — wrong signal for a tool a laundry owner is paying GHS 90/month for. Clay reads as warm and rooted — right signal.

## **Neutrals**

- **Background:** Warm off-white, not stark white. Roughly `#FAF8F5`. This warmth is where the local feel lives — subtle, not loud. Stark `#FFFFFF` will feel imported.
- **Text:** Deep charcoal, not pure black. Roughly `#1A1A1A`.
- **Borders and dividers:** Soft warm grey, roughly `#E8E4DD`.
- **Surface elevation:** Use background tint shifts (a slightly darker warm off-white) rather than drop shadows. No shadows on flat surfaces.

## **Functional colours**

- **Success** — a soft green-tint, distinct from the primary emerald so they don't fight.
- **Warning** — a calm amber. Used for soft SMS overage warnings (70% threshold), grace period dashboards, low-priority alerts.
- **Error / Overdue** — a muted red, not alarm-bell red.
- **Info** — a soft blue, used sparingly for "Confirmed" status and informational tooltips.

## **Status colour mapping**

This is one of the most-used visual systems in the product. Lock these:

| Status | Colour | Reasoning |
|---|---|---|
| Received | Neutral grey | Just arrived, no action yet |
| Confirmed | Info blue | Verified, in the system |
| Processing | Warning amber | Actively in motion |
| **Ready** | **Primary emerald** | The high-value moment — visually celebratory in the brand's own colour |
| Collected | Muted green/grey | Done, calm, archived feel |
| Cancelled | Muted red | Closed, not alarming |

The deliberate move: "Ready" gets the brand primary. That's the moment the customer gets the SMS, the moment the laundry has done its job. Make it feel like a small win every time.

---

# **8. Typography**

## **Direction**

**Humanist sans with character.** Söhne, GT America, Public Sans, or equivalent. Slightly warmer and more editorial than pure geometric sans (Inter, Geist). Not a display font for body, not a quirky font for headings — just one carefully chosen humanist sans that does everything.

## **Type hierarchy (proposed, to be refined)**

- **Display** (rare — used on empty states, milestone moments): 32–48px, weight 600
- **H1 / page title:** 24–28px, weight 600
- **H2 / section heading:** 18–20px, weight 600
- **Body:** 15–16px, weight 400
- **Label / meta:** 13–14px, weight 500
- **Caption / timestamps:** 12–13px, weight 400

## **Numerical display**

Pricing, pickup codes, order numbers, payment amounts — all of these are scanned constantly. Use **tabular figures** (monospaced digits) for any list or table of numbers. Same digit takes the same width, so `GHS 90.00` and `GHS 145.00` align cleanly down a column.

The pickup code (5 digits) is the most-scanned number in the product. Display it large, tabular, with generous letter-spacing so each digit is unambiguous. On the order detail screen, the pickup code should feel like a *moment*, not a value.

---

# **9. Density & Layout**

Lists and tables show **8–10 items per page with breathing room**, with numbered pagination at the bottom (desktop) and a "Load more" button (mobile). This is a deliberate choice — Rinsion is not Linear (densely packed) or Salesforce (cluttered). It's closer to Stripe's dashboard rhythm: information-rich but never cramped.

## **Forgiving by default, powerful when ready**

The product is designed for an employee who has never used SaaS before, *and* a power-user employee doing 80 orders a day. Both use the same UI.

- **Defaults are forgiving.** Big tap targets on mobile. Confirmation modals on destructive actions. Inline help text under fields on first use. Buttons labelled with verbs, not icons. Empty states that tell you exactly what to do next.
- **Power is layered on, not in the way.** Keyboard shortcuts (`N` for new order, `/` for global search, `Esc` to close). A command palette (`Cmd/Ctrl+K`) to jump anywhere. Bulk actions on tables for admins. These are discoverable when the user is ready — beginners simply ignore them.
- **No "advanced mode" toggle.** One UI. Power features live alongside forgiving defaults.

## **Help is part of the UI, not a separate help system**

No documentation site. No chatbot. No "?" icons that open modals.

- Inline microcopy under fields.
- Ghost text in inputs showing the format expected.
- Empty states that explain themselves and offer the next action.
- Status badges with both colour *and* text label (so colour-blind users aren't lost, and so the meaning is always visible at a glance).

This is what "constantly on the move, help should be easily recognisable" looks like in practice.

---

# **10. Iconography**

**Filled icons.** Heavier, more confident. Phosphor Fill, Heroicons Solid, or equivalent. Avoid outline icons — they read lighter and less assertive, which conflicts with the "sharp" personality.

Icons are used sparingly. They support text labels; they don't replace them. A button labelled `[icon] Create Order` is fine. A button that is just `[icon]` is not (except in well-established patterns: search magnifier in the header, close X on modals, the "o" spinner).

---

# **11. Illustration & Empty States**

When a screen has no data ("No orders yet", "No customers found"), the empty state is carried by **a small abstract shape or pattern** — not a line illustration, not a photograph, not a cartoon. The shape should feel like it belongs to the Rinsion visual system (potentially derived from the "o" mark — concentric rings, an off-centre dot, a soft fade).

No stock illustrations from undraw.co, storyset, or any generic illustration library. No mascots. No characters.

Empty state structure:

1. The abstract shape (small, restrained)
2. A short, plain headline ("No orders yet")
3. One sentence of explanation ("New orders will appear here as employees create them.")
4. One clear primary action ("Create your first order")

---

# **12. Animation & Loading**

## **The "o" spinner**

When the system is loading, the spinner is the **"o" from the wordmark**, lifted out and spinning. Not a generic CSS spinner. Not a skeleton loader that pretends to be the final UI. Just the "o", spinning. This is a small detail that adds up across hundreds of daily interactions.

## **Other motion principles**

- **Functional, not decorative.** Animations explain state changes (a status badge transitioning colour as an order moves to Ready), confirm actions (a brief check-mark on payment recorded), or guide attention (a fresh order entry sliding into the list). They don't perform for the user.
- **No auto-playing animations on dashboard load.** Feels gimmicky by the third login.
- **Fast.** 150–250ms for most transitions. Nothing over 400ms unless it's a deliberate moment (order completion, payment success).

---

# **13. Hero Screens (Full Detail)**

These five screens get the most design attention. Every other screen should match their quality, but if Claude Design's attention budget is finite, these win.

## **13.1 Create Order**

The most-used screen in the product. An employee uses this 20–80 times a day. It must be fast, forgiving, and unambiguous.

**Flow on the screen, top to bottom:**

1. **Customer block** — search by phone or name, or "+ New Customer". If found, the customer's name and phone appear at the top of the form as a small, confident header. If new, an inline expansion lets them add the customer without leaving the page.
2. **Branch selector** (Admin only) — a clear dropdown of branches under the laundry. Employees skip this; their branch is auto-tagged.
3. **Order details** — pickup date (date picker, defaulting to tomorrow), priority (Normal / Express / Urgent, shown as toggle pills, only if enabled in settings).
4. **Items section** — the core of the screen. Each line lets the employee pick:
   - Item type (Shirt, Trouser, Suit, …)
   - Service (Wash Only, Wash + Iron, Dry Clean, …)
   - Quantity
   
   The unit price auto-fills from the pricing matrix. Line total appears on the right. A clean "+ Add item" button beneath the last line. Items can be reordered or deleted inline.
5. **Notes** — a freeform textarea for special instructions, damage notes, customer requests.
6. **Summary footer** — sticky at the bottom on desktop, fixed at the bottom on mobile. Shows: item count, subtotal, total, pickup date. Primary action: "Create Order". Secondary: "Cancel".

**Design principles for this screen:**

- The form is **one continuous page**, not a wizard. Wizards punish power users.
- The items section is the visual centre — most weight, most space, most polish.
- On mobile, the summary footer is always visible, sticky, with the total in tabular figures.
- On desktop, the customer block and branch selector live in a compact top section so the items table can dominate.

## **13.2 Order Detail**

The second most-used screen. Opened from any list, from search, from notification follow-up. It has to communicate a lot of state cleanly.

**Information hierarchy:**

1. **Header** — order number, pickup code (large, tabular, framed in a thin "o" ring), current status badge, customer name + phone.
2. **Status stepper** — horizontal on desktop, vertical on mobile. Shows all six stages (Received → Confirmed → Processing → Ready → Collected). Current stage highlighted, completed stages in muted primary, future stages in neutral. Cancelled state breaks the stepper and shows a "Cancelled" indicator instead.
3. **Items block** — clean table of line items with item type, service, quantity, unit price, line total. Totals at the bottom right.
4. **Payment summary** — total due, amount paid (computed), balance (computed). If balance > 0, an inline "Record Payment" action is prominent.
5. **Notes** — chronological list, each note with author and timestamp.
6. **Activity history** — collapsible by default. Expand to see every status change with employee + timestamp, every payment, every SMS attempt (sent / failed).
7. **Action bar** — sticky at the top right on desktop, bottom on mobile. Primary actions visible: "Update Status", "Record Payment", "Edit Order". Less common actions ("Cancel Order", "Resend SMS") in a "More" menu.

**The pickup code moment.** This is the screen where the pickup code lives. Treat it as a moment — large, tabular, generously spaced, framed by a thin "o" ring. When the code is needed (employee on the phone with a customer who lost the SMS), it should be findable in under one second.

## **13.3 Dashboard**

The first screen every user sees. The make-or-break first impression.

**Admin dashboard structure:**

1. **Hero block** — not six equal stat cards. One large, scannable list of "Orders ready for collection" with customer name, pickup code, and pickup date. This is the most actionable view in the business. If there are zero ready orders, this block becomes a small empty state ("All caught up — no orders waiting for pickup").
2. **Secondary stats** — smaller cards below: Today's orders, Outstanding payments, Active customers this week. Stats only; no charts in v1.
3. **Recent activity** — a feed of recent orders, recent payments, recent employee actions. Scannable, dense but breathing.
4. **Quick actions** — persistent in the top right: "+ Customer", "+ Order", global search.

**Employee dashboard structure:**

Lighter version of the admin dashboard. Same "Orders ready for collection" hero block (filtered to their branch), same recent orders feed (their branch only), same quick actions. No financial stats — those are admin-only.

## **13.4 Pricing Matrix**

Admin-only. Used during onboarding (set all prices) and occasionally afterward (update one price, add a new service).

**The visual:** a true matrix. Rows = item types, columns = services. Each cell is either a price or empty (combination not offered).

- Empty cells are visually distinct from priced cells — soft grey background, "+ Set price" on hover (desktop) or tap.
- Priced cells show the amount in tabular figures, large enough to scan a column at a glance.
- Cells can be edited inline (click → editable field → save / cancel). No modal.
- A row header (item type name) and column header (service name) are both clickable to edit the name or deactivate.
- Adding a new item type or service: a clear "+ Add row" at the bottom of the rows column, "+ Add column" at the end of the services row.

**Why this screen matters:** it's the screen that decides whether onboarding takes 5 minutes or 50. If it's frictionless, the laundry owner is operational by lunch. If it's clunky, they abandon.

## **13.5 First-Run Setup (Onboarding Wizard)**

A laundry owner signs up for the trial. Before they hit the dashboard, they go through a 2–3 minute guided setup.

**Three steps:**

1. **Laundry & branches** — laundry name, first branch name. Option to add more branches now or later.
2. **Services** — pre-populated list of common services (Wash Only, Wash + Iron, Dry Clean, Press Only, Dry Clean + Press). The owner checks the ones they offer. Can add custom services on a second pass.
3. **Pricing** — a stripped-down version of the pricing matrix. Pre-populated item types (Shirt, Trouser, Suit, Bedsheet, Pillowcase, Towel — common defaults). Owner sets prices for the combinations they offer, leaves the rest blank. Can be skipped and completed later.

After the wizard: drop them on the dashboard with one small, dismissible banner: "You're set up. Create your first order to see it in action." → links to Create Order.

**Design principles for the wizard:**

- Wizard chrome is minimal — one step visible at a time, progress indicator at the top, "Back" and "Next" at the bottom.
- Each step is skippable except step 1.
- The wizard never traps the user. "I'll do this later" is always available.

---

# **14. Other Screens (Standard Quality)**

Every screen should still feel quality — same colour, type, density, components. The brief doesn't specify them in full because the design principles above apply uniformly.

- **Customer list** — searchable table, columns: name, phone, last visit, total orders (computed), action menu. "+ Customer" in the top right.
- **Customer detail** — header with customer info, order history table, lifetime revenue computed, "Create Order" prominent.
- **Order list** — filterable by status, branch, date range. Searchable by order number, pickup code, customer name, phone. 8–10 per page with pagination.
- **Payments screen** — filterable list of all payments, columns: date, customer, order, amount, method, recorded by.
- **Employees screen** (admin) — list of employees, role, branch, status. "+ Add Employee" sends an invitation.
- **Items & Services screens** (admin) — two simple lists, edit inline, deactivate without deleting.
- **Settings screen** (admin) — laundry info, branches, operational toggles (partial payments, express orders, pickup code requirement, customer submissions).
- **Reports screen** (admin) — three simple report views: revenue summary, order summary, employee activity. Stats and tables in v1; no charts.

---

# **15. Subscription State UI**

The product enforces subscription limits, grace periods, and SMS quotas. These create UI states owners will encounter when things go wrong.

## **Hard block / lockout (existential)**

Full-screen banner across every screen until resolved. The owner cannot miss it. Tone: factual, not alarming. Example: "Your subscription expired 3 days ago. Restore access by completing payment." Primary action: "Pay now" (manual MoMo at launch; Paystack post-launch).

## **Soft warnings (informational)**

Dashboard-only. A persistent but non-blocking banner at the top of the dashboard. SMS overage warnings at 70% usage live here, with projected overage cost. Grace period day 1–6 (soft block) lives here.

## **Inline at decision points**

When an employee tries to send an SMS and the cap is hit, an inline warning appears at the moment of the action. No surprise mid-flow.

The principle: **the more existential the issue, the more visible the warning. Don't nag the owner about routine things; don't let them miss the existential ones.**

---

# **16. SMS & Customer-Facing Messages**

The customer's first touchpoint with Rinsion is the SMS — not the app. The SMS must communicate clearly who it is from (the laundry, not Rinsion) and what action the customer should take.

## **Sender ID**

The SMS sender ID is **`Rinsion`** — a single sender ID used across all laundries on the platform. (This is a deliberate operational choice: it lets Rinsion ship SMS immediately under one sender registration with mNotify, rather than waiting on per-laundry sender ID approvals.)

Because the sender ID is `Rinsion` — a name the customer has never seen before — **the laundry's name must lead the message body**. Without this, the customer has no idea which business is texting them.

## **Tone**

Warm, brief, laundry-name-led. The laundry's name is the first word of every message:

**Order created:**
> {laundry_name}: Hi {customer_first_name}, your order is in. Pickup code: {pickup_code}. We'll text you when it's ready.

**Order ready:**
> {laundry_name}: Hi {customer_first_name}, your order is ready for pickup. Pickup code: {pickup_code}. See you soon.

**Pickup code resend:**
> {laundry_name}: Hi {customer_first_name}, your pickup code is {pickup_code}.

## **Design principle**

The customer's mental model is: *I dropped my clothes at Clean Pro Laundry, and I'm getting messages from Clean Pro Laundry.* Rinsion is the silent infrastructure — never named in the message body, only present as the sender ID for technical reasons. This protects each laundry's relationship with their customer and avoids confusion across laundries (a customer who uses multiple laundries sees the laundry name lead every message, so they always know who's writing).

## **Onboarding implication**

Because the laundry name is in the SMS body, length matters. Long laundry names eat into the 160-character SMS budget and look heavy in the message. During onboarding, the setup wizard should show a **live SMS preview** with the laundry's chosen name interpolated into the actual message, so the owner sees exactly how their SMS will read before they finish setup. If the resulting SMS exceeds 160 characters, the owner is warned and prompted to choose a shorter display name.

## **No SMS overage to the customer**

Customers never receive marketing or system-status SMS. Only the three transactional messages above (and any future Product B messages).

---

# **17. Receipts**

Online receipts only at launch. No printed receipts in v1. Printed receipt design (thermal 80mm or A5 PDF) is a future workstream, not in this brief.

The online receipt is essentially the **Order Detail screen**, optionally rendered as a shareable view (read-only, no actions). The design work for receipts is therefore the design work for Order Detail.

---

# **18. Mobile-Specific Patterns**

The product is desktop-first (employees on shop laptops, admins doing reports), but **mobile is a first-class citizen** (admins checking in from their phones, employees on tablets, owners reviewing on the move).

## **Mobile navigation**

**Bottom tab bar.** Five tabs:

- Dashboard
- Orders
- Customers
- Payments
- More (employees, settings, items & services, reports, profile, logout)

Native-app feel. Faster than a hamburger for users doing 50+ taps a day. Worth the extra design work.

## **Mobile-specific moments**

- **Create Order on mobile** — the items section uses cards instead of a table. Each card is a single item line with item type, service, quantity, line total. "+ Add item" is a full-width button. The summary footer is fixed at the bottom of the viewport.
- **Order Detail on mobile** — the status stepper is vertical, not horizontal. The action bar is a fixed bottom strip with primary action prominent.
- **Pricing Matrix on mobile** — admins are unlikely to set up pricing on mobile, but they may need to update a price on the go. Render as a list (item type → expandable services with prices) rather than a true matrix. Editing a price opens a small bottom sheet, not a full modal.

## **Touch targets**

Minimum 44×44px tappable area for all primary actions. More generous (48×48px+) on the Create Order and Update Status screens, which are the most-tapped flows.

---

# **19. Currency, Date, and Time Formats**

Lock these everywhere:

- **Currency:** `GHS 90.00` — always two decimal places, always tabular figures in lists, always the `GHS` prefix.
- **Date:** `28 June 2026` — day, full month name, four-digit year. Compact form (`28 Jun 2026`) acceptable in tight table columns.
- **Time:** 24-hour where space is tight (`16:30`), 12-hour with `am/pm` in friendly contexts (`4:30 pm`).
- **Phone numbers:** Ghanaian format, `0244 567 890` — leading zero, three-digit groupings.

---

# **20. Microcopy Principles**

- **Verbs in buttons.** "Create Order", not "Submit". "Record Payment", not "Save". "Mark Collected", not "Confirm".
- **Plain English.** No "Please ensure that you have completed all required fields." Just "Add at least one item to continue."
- **Confirm destructive actions in the actor's voice.** "Cancel this order?" not "Are you sure you want to perform this action?"
- **Empty states tell you the next step.** Not "No data." Always "No customers yet — add your first customer."
- **Error messages are useful, not technical.** "Unable to record payment. Please try again." not "PostgreSQL Error 23505."

---

# **21. The Forbid List**

Things explicitly out of scope, by design:

- ❌ Stock photography of smiling staff in matching aprons
- ❌ Cartoon illustrations
- ❌ Generic line illustrations (no undraw.co, no storyset)
- ❌ Gradients on buttons or backgrounds
- ❌ Rounded corner radius above 12px (keeps things sharp)
- ❌ Emojis in UI
- ❌ Drop shadows on flat surfaces (use background tint shifts for elevation)
- ❌ Skeleton loaders that mimic the final UI (use the "o" spinner)
- ❌ Auto-playing animations on dashboard load
- ❌ Twi or pidgin in UI copy
- ❌ Kente, adinkra, or other literal cultural motifs
- ❌ "Yay!", "🎉", "Awesome!" or other over-friendly consumer-app voice
- ❌ Sidebar + chart-card dashboard layout (the Bootstrap admin template look)
- ❌ Outline icons (use filled)
- ❌ Time-of-day dashboard variants (predictability beats cleverness for v1)
- ❌ Mascots or characters

---

# **22. Deliverables**

From Claude Design, this brief expects:

1. **Wordmark** — full Rinsion wordmark, with the "o" designed to stand alone.
2. **The "o" mark** — isolated, in icon contexts (favicon, app icon, social avatar).
3. **The "o" spinner** — animation reference for the loading state.
4. **Colour palette** — primary emerald, clay accent, neutrals, functional colours, status mapping. Tuned hex values.
5. **Typography system** — chosen humanist sans, type scale, weights, tabular figures specification.
6. **Component library** — buttons (primary, secondary, ghost, destructive), inputs, dropdowns, tables, cards, badges, banners, modals, bottom sheets (mobile), tabs, pagination, empty states.
7. **Iconography set** — filled icons covering all UI needs.
8. **Five hero screens at full polish** — Create Order (desktop + mobile), Order Detail (desktop + mobile), Dashboard (desktop + mobile, admin + employee), Pricing Matrix (desktop + mobile), First-Run Setup (desktop + mobile).
9. **Remaining screens at standard quality** — see section 14.
10. **SMS template copy** in final form, with character counts verified against mNotify limits.

---

# **23. Success Criteria**

The design succeeds if:

1. A Ghanaian laundry owner, on first sight, says *"This looks like it was made for us."*
2. A new employee can use the Create Order screen without training and create their first order in under 90 seconds.
3. A power-user employee can create an order in under 30 seconds using keyboard shortcuts.
4. The wordmark and the isolated "o" are both immediately recognisable as Rinsion.
5. The product is visually distinct from any other Ghanaian SaaS (no blue twins of Hubtel / Paystack / mNotify) while still feeling locally rooted.
6. Every screen feels like it belongs to the same product — same rhythm, same voice, same intent.

# **End of Design Brief**
