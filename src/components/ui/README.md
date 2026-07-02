# UI Primitives

| Component | Description | Key props |
|-----------|-------------|-----------|
| `OMark` | Notched circle brand mark SVG | `size`, `variant` (default/reversed/muted-red), `spinning`, `thin` |
| `Spinner` | Loading spinner — readability alias for `<OMark spinning>` | `size`, `variant` |
| `Wordmark` | Full "Rinsion" wordmark with custom i/o letterforms | `size` (sm/md/lg), `variant` (default/reversed) |
| `Button` | Primary, accent, secondary, ghost, destructive variants | `variant`, `size`, `isPending`, `filled` |
| `Input` | Text input with label, helpText, error | `label`, `helpText`, `error` |
| `Select` | Native select with custom chevron | `label`, `helpText`, `error` |
| `Textarea` | Resizable textarea with same focus ring as Input | `label`, `helpText`, `error` |
| `Card` | White surface, warm-300 border, rounded-10 | `header`, `footer` |
| `DataTable` | CSS grid table | `columns`, `rows`, `getRowKey`, `onRowClick`, `emptySlot` |
| `EmptyState` | Concentric rings + OMark + headline/body/action | `headline`, `body`, `action` |
| `Pagination` | Numbered desktop / load-more mobile at 720px | `page`, `totalPages`, `onPageChange`, `hasMore` |
| `Modal` | `@radix-ui/react-dialog`, 12px radius, focus-trapped | `open`, `onClose`, `title`, `description` |
| `Sheet` | Bottom sheet, `animate-sheet-up`, `@radix-ui/react-dialog` | `open`, `onClose`, `title` |
| `Banner` | Inline feedback bar | `variant` (info/warning/success/destructive), `dismissable` |
| `Toast` / `ToastProvider` | `sonner` toast — `import { toast }` then `toast.success(…)` | Mount `<ToastProvider />` once in layout |
| `GlobalSearch` | `/` shortcut, routes to `/orders?q=…` | — |
| `CommandPalette` | `⌘K` command launcher using `cmdk` | — |

# App Components (`src/components/app/`)

| Component | Description | Key props |
|-----------|-------------|-----------|
| `StatusBadge` | Order status pill (dot + label) | `status` (received/confirmed/processing/ready/collected/cancelled) |
| `StatCard` | KPI card with label/value/delta | `label`, `value`, `delta` |
| `PickupCodeChip` | sm: monospace code; lg: thin OMark ring + code | `code`, `size` (sm/lg) |
