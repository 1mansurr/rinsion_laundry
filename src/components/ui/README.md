# UI Primitives

Before adding new inline styling to a screen (a raw `<button>`, `<input>`,
`bg-white border rounded-18 p-5` card shell, a hand-rolled confirm dialog,
etc.), check this table first — most of what a new screen needs already has
a home here or in the App Components list below. Reinventing one of these
inline is exactly the token/color drift Phases 1–3 of `desing_SKILL.md`
cleaned up; don't reintroduce it.

| Component | Description | Key props |
|-----------|-------------|-----------|
| `OMark` | Notched circle brand mark SVG | `size`, `variant` (default/reversed/muted-red), `spinning`, `thin` |
| `Spinner` | Loading spinner — readability alias for `<OMark spinning>` | `size`, `variant` |
| `Wordmark` | Full "Rinsion" wordmark with custom i/o letterforms — use this everywhere the logo appears, never a hand-rolled icon+text lockup | `size` (sm/md/lg), `variant` (default/reversed) |
| `Button` | Primary, accent, secondary, ghost, destructive variants | `variant`, `size`, `isPending`, `filled` |
| `Input` | Text input with label, helpText, error | `label`, `helpText`, `error` |
| `Select` | Native select with custom chevron | `label`, `helpText`, `error` |
| `Textarea` | Resizable textarea with same focus ring as Input | `label`, `helpText`, `error` |
| `PasswordInput` | Show/hide password toggle, filled eye/eye-off icons | — |
| `SearchableSelect` | Searchable dropdown for long option lists | `options`, `value`, `onChange` |
| `Card` | White surface, warm-300 border, rounded-18 | `header`, `footer` |
| `DataTable` (`Table.tsx`) | CSS grid table | `columns`, `rows`, `getRowKey`, `onRowClick`, `emptySlot` |
| `EmptyState` | Concentric rings + OMark + headline/body/action | `headline`, `body`, `action` |
| `Pagination` | Numbered desktop / load-more mobile at 720px | `page`, `totalPages`, `onPageChange`, `hasMore` |
| `UrlPagination` | Same as `Pagination` but reads/writes the URL query string | `page`, `totalPages`, `pathname`, `searchParams` |
| `PageSkeleton` / `CardSkeleton` | Loading-state placeholders | `rows` |
| `Modal` | `@radix-ui/react-dialog`, 22px radius, focus-trapped | `open`, `onClose`, `title`, `description` |
| `Sheet` | Bottom sheet, `animate-sheet-up`, `@radix-ui/react-dialog` | `open`, `onClose`, `title` |
| `ConfirmDialog` | Destructive-confirmation modal — always pass a specific `confirmLabel` that repeats the verb ("Delete order"), never rely on the generic "Delete" default alone if a more specific one reads better | `title`, `message`, `confirmLabel`, `requireTypedText`, `onConfirm` |
| `Banner` | Inline feedback bar | `variant` (info/warning/success/destructive), `dismissable` |
| `Toast` / `ToastProvider` | `sonner` toast — `import { toast }` then `toast.success(…)`. Supports an undo action out of the box: `toast.success('X deleted', { action: { label: 'Undo', onClick: () => restoreX(id) } })` — see the delete flows in `EmployeesClient`/`OrderDetail`/etc. for the pattern | Mount `<ToastProvider />` once in layout |
| `GlobalSearch` | `/` shortcut, routes to `/orders?q=…` | — |
| `CommandPalette` | `⌘K` command launcher using `cmdk` | — |
| `SignOutButton` | Sign-out action, consistent styling | `className` |

# App Components (`src/components/app/`)

| Component | Description | Key props |
|-----------|-------------|-----------|
| `StatusBadge` | Order status pill (dot + label) — 4-state only, `confirmed` was retired (see Resolved decision #1 in `desing_SKILL.md`) | `status` (received/processing/ready/collected/cancelled) |
| `StatCard` | KPI card with label/value/delta | `label`, `value`, `delta` |
| `PickupCodeChip` | sm: monospace code; lg: thin OMark ring + code | `code`, `size` (sm/lg) |
| `SmsPreview` | Live SMS preview bubble + char counter (neutral→amber→red at 140/160) — pair with `buildOrderReadySmsPreview` from `@/utils/smsPreview` for the real order-ready copy, or pass any other `message` | `message`, `label`, `helpText` |
| `RestrictedCard` | "Admin access only" empty-state card for role-gated pages | — |
| `UnauthorizedNotice` | Access-denied notice | — |
| `CreateOrderFab` | Floating "New order" action button | — |
