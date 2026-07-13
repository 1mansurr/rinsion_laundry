'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/services/orders/createOrder'
import type { CreateOrderInput } from '@/services/orders/createOrder'
import { recordPayment } from '@/services/payments/recordPayment'
import { createCustomer } from '@/services/customers/createCustomer'
import type { ItemType } from '@/services/items/getItemTypes'
import type { LaundryService } from '@/services/services/getServices'
import type { PriceCell } from '@/services/pricing/getPricingMatrix'
import type { Customer } from '@/services/customers/getCustomers'
import { PAYMENT_METHODS, type OrderPriority, type PaymentMethod, type PricingMode } from '@/constants/statuses'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', mobile_money: 'Mobile Money', card: 'Card', bank_transfer: 'Bank Transfer', other: 'Other',
}
import { formatCurrency } from '@/utils/formatCurrency'
import { formatPriceRange } from '@/utils/formatPriceRange'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface LineItem {
  itemTypeId: string
  serviceId: string
  /** Piece count when pricingMode is 'per_item', weight in kg when 'per_kg' */
  quantity: number
  /** null = a range price awaiting manual entry by the employee */
  unitPrice: number | null
  totalPrice: number
  pricingMode: PricingMode
  /** Resolved price bounds for the current item+service; equal for a fixed price. Null until a priced combo is selected. */
  priceMin: number | null
  priceMax: number | null
  priceNotes: string | null
}

interface Props {
  itemTypes: ItemType[]
  services: LaundryService[]
  prices: PriceCell[]
  customers: Customer[]
  preselectedCustomer?: Customer | null
  allowExpressOrders?: boolean
}

const EMPTY_LINE: LineItem = {
  itemTypeId: '', serviceId: '', quantity: 1, unitPrice: null, totalPrice: 0, pricingMode: 'per_item',
  priceMin: null, priceMax: null, priceNotes: null,
}

const PRIORITY_LABELS: Record<OrderPriority, string> = {
  normal: 'Normal',
  express: 'Express',
  urgent: 'Urgent',
}

export function CreateOrderForm({
  itemTypes, services, prices, customers, preselectedCustomer,
  allowExpressOrders = true,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState(
    preselectedCustomer ? `${preselectedCustomer.firstName} ${preselectedCustomer.lastName}` : ''
  )
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer ?? null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Inline customer creation
  const [showInlineCreate, setShowInlineCreate] = useState(false)
  const [inlineFirst, setInlineFirst] = useState('')
  const [inlineLast, setInlineLast] = useState('')
  const [inlinePhone, setInlinePhone] = useState('')
  const [inlineError, setInlineError] = useState('')
  const [inlineIsPending, startInlineTransition] = useTransition()

  // Order fields
  const [priority, setPriority] = useState<OrderPriority>('normal')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  // Pay in advance
  const [payInAdvance, setPayInAdvance] = useState(false)
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('mobile_money')

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCustomers = customerSearch.length >= 1
    ? customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 8)
    : customers.slice(0, 5)

  // A service is only offered at intake once it's actually priced: a per_kg
  // service needs a rate set, a per_item service needs at least one priced item type.
  const usableServices = services.filter(s => s.isActive && (
    s.pricingMode === 'per_kg'
      ? s.minKgRate !== null
      : itemTypes.some(t => t.isActive && prices.some(p => p.itemTypeId === t.id && p.serviceId === s.id && p.isActive))
  ))

  function getService(serviceId: string) {
    return services.find(s => s.id === serviceId)
  }

  function getAvailableItemTypes(serviceId: string) {
    if (!serviceId) return []
    return itemTypes.filter(t =>
      t.isActive && prices.some(p => p.itemTypeId === t.id && p.serviceId === serviceId && p.isActive)
    )
  }

  /** Resolves the price bounds for an item+service combo. Null if unpriced/not yet selected. */
  function getPriceRange(itemTypeId: string, serviceId: string, mode: PricingMode): { min: number; max: number; notes: string | null } | null {
    if (mode === 'per_kg') {
      const svc = getService(serviceId)
      if (!svc || svc.minKgRate === null || svc.maxKgRate === null) return null
      return { min: svc.minKgRate, max: svc.maxKgRate, notes: svc.notes }
    }
    const cell = prices.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId && p.isActive)
    if (!cell) return null
    return { min: cell.minPrice, max: cell.maxPrice, notes: cell.notes }
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, ...patch }
      const identityChanged = patch.serviceId !== undefined || patch.itemTypeId !== undefined
      if (patch.serviceId !== undefined) {
        const svc = getService(updated.serviceId)
        updated.pricingMode = svc?.pricingMode ?? 'per_item'
        if (updated.pricingMode === 'per_kg') {
          updated.itemTypeId = ''
        } else {
          const avail = getAvailableItemTypes(updated.serviceId)
          if (!avail.some(t => t.id === updated.itemTypeId)) {
            updated.itemTypeId = avail.length === 1 ? avail[0].id : ''
          }
        }
      }
      // Only re-resolve the price when the service/item selection changes —
      // never on quantity, or a manually-entered range price would get
      // clobbered on every stepper tick.
      if (identityChanged) {
        const range = getPriceRange(updated.itemTypeId, updated.serviceId, updated.pricingMode)
        updated.priceMin = range?.min ?? null
        updated.priceMax = range?.max ?? null
        updated.priceNotes = range?.notes ?? null
        // Fixed price (min === max, including no-range services) auto-fills exactly
        // as before; a genuine range starts unfilled, awaiting manual entry.
        updated.unitPrice = range && range.min === range.max ? range.min : null
      }
      updated.totalPrice = updated.unitPrice !== null ? updated.unitPrice * updated.quantity : 0
      return updated
    }))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)) }

  // Adds a per-item line for a service that's otherwise priced by weight —
  // e.g. a suit priced individually even though the service is fundamentally
  // per-kg. Pre-fills the same service; staff can still change it.
  function addExceptionLine(serviceId: string) {
    const avail = getAvailableItemTypes(serviceId)
    const itemTypeId = avail.length === 1 ? avail[0].id : ''
    const range = getPriceRange(itemTypeId, serviceId, 'per_item')
    const unitPrice = range && range.min === range.max ? range.min : null
    setLines(prev => [...prev, {
      serviceId, itemTypeId, quantity: 1,
      unitPrice, totalPrice: unitPrice !== null ? unitPrice : 0,
      pricingMode: 'per_item',
      priceMin: range?.min ?? null, priceMax: range?.max ?? null, priceNotes: range?.notes ?? null,
    }])
  }

  const total = lines.reduce((s, l) => s + l.totalPrice, 0)
  const validLines = lines.filter(l => {
    if (!l.serviceId || (l.pricingMode !== 'per_kg' && !l.itemTypeId) || l.quantity <= 0) return false
    if (l.unitPrice === null) return false
    if (l.priceMin !== null && l.priceMax !== null && (l.unitPrice < l.priceMin || l.unitPrice > l.priceMax)) return false
    return true
  })
  // A range line that's fully selected (service+item) but still missing a manual
  // price, or filled outside bounds, must block submission rather than silently
  // dropping out of the order the way an untouched blank line already does.
  const hasIncompleteRangeLine = lines.some(l =>
    l.priceMin !== null && l.priceMax !== null && l.priceMin !== l.priceMax &&
    (l.unitPrice === null || l.unitPrice < l.priceMin || l.unitPrice > l.priceMax)
  )
  const canSubmit = !!selectedCustomer && validLines.length > 0 && !hasIncompleteRangeLine

  function openInlineCreate() {
    const parts = customerSearch.trim().split(' ')
    setInlineFirst(parts[0] ?? '')
    setInlineLast(parts.slice(1).join(' '))
    setInlinePhone('')
    setInlineError('')
    setShowInlineCreate(true)
    setShowDropdown(false)
  }

  function handleInlineCreate() {
    if (!inlineFirst.trim()) { setInlineError('First name is required'); return }
    if (!inlinePhone.trim()) { setInlineError('Phone number is required'); return }
    setInlineError('')
    startInlineTransition(async () => {
      const res = await createCustomer({
        firstName: inlineFirst.trim(),
        lastName: inlineLast.trim(),
        phone: inlinePhone.trim(),
      })
      if (res.success) {
        setSelectedCustomer(res.data)
        setCustomerSearch(`${res.data.firstName} ${res.data.lastName}`)
        setShowInlineCreate(false)
      } else {
        setInlineError(res.error)
      }
    })
  }

  function handleSubmit() {
    if (!selectedCustomer || !canSubmit) return
    setError(null)
    const input: CreateOrderInput = {
      customerId: selectedCustomer.id,
      priority,
      pickupDate: pickupDate || undefined,
      notes: notes || undefined,
      items: validLines.map(l => ({
        itemTypeId: l.itemTypeId || undefined,
        serviceId: l.serviceId,
        quantity: l.quantity,
        // validLines guarantees unitPrice is non-null and within [priceMin, priceMax]
        unitPrice: l.unitPrice!,
        totalPrice: l.totalPrice,
        pricingMode: l.pricingMode,
      })),
    }
    startTransition(async () => {
      const res = await createOrder(input)
      if (!res.success) { setError(res.error); return }
      if (payInAdvance && total > 0) {
        await recordPayment({ orderId: res.data.orderId, amount: total, paymentMethod: advanceMethod })
      }
      router.push(`/orders/${res.data.orderId}`)
    })
  }

  return (
    <div className="relative">
      {error && (
        <div className="mb-4 bg-[#FDF1EF] border border-[#E0BBB6] rounded-7 px-4 py-3 text-ui text-error-fg">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Customer block */}
        <section>
          <p className="text-label font-medium text-warm-700 mb-2">Customer</p>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-white border border-warm-300 rounded-10 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand text-[#FAF8F5] text-[14px] font-semibold shrink-0">
                  {selectedCustomer.firstName[0] ?? ''}{selectedCustomer.lastName[0] ?? ''}
                </span>
                <div>
                  <p className="text-ui font-medium text-warm-950">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-caption text-warm-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                className="text-caption text-brand hover:text-brand-hover underline underline-offset-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <Input
                placeholder="Search by name or phone…"
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); setShowInlineCreate(false) }}
                onFocus={() => { if (!showInlineCreate) setShowDropdown(true) }}
              />
              {/* Mobile: always-visible affordance, matching the search dropdown's own "+ Add new customer" link */}
              {!showDropdown && !showInlineCreate && (
                <button
                  type="button"
                  onClick={openInlineCreate}
                  className="md:hidden mt-2.5 w-full flex items-center justify-center gap-2 border border-dashed border-warm-400 rounded-10 py-3.5 text-ui font-semibold text-brand"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0F3D2E" aria-hidden>
                    <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
                  </svg>
                  Add new customer
                </button>
              )}
              {showDropdown && !showInlineCreate && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-warm-300 rounded-10 shadow-modal overflow-hidden">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-4 py-3 text-body text-warm-500">No customers found</div>
                  ) : (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-100 text-left"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setCustomerSearch(`${c.firstName} ${c.lastName}`)
                          setShowDropdown(false)
                        }}
                      >
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warm-200 text-[12px] font-semibold text-warm-700 shrink-0">
                          {c.firstName[0] ?? ''}{c.lastName[0] ?? ''}
                        </span>
                        <div>
                          <p className="text-ui font-medium text-warm-950">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-caption text-warm-500">{c.phone}</p>
                        </div>
                      </button>
                    ))
                  )}
                  <div className="border-t border-warm-200 px-4 py-2.5">
                    <button
                      type="button"
                      className="text-caption text-brand hover:text-brand-hover"
                      onClick={openInlineCreate}
                    >
                      + Add new customer
                    </button>
                  </div>
                </div>
              )}

              {/* Inline customer creation */}
              {showInlineCreate && (
                <div className="mt-2 bg-white border border-warm-300 rounded-10 p-4 space-y-3">
                  <p className="text-label font-semibold text-warm-800">New customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-warm-700 mb-1 block">
                        First name <span className="text-error-fg">*</span>
                      </label>
                      <input
                        type="text"
                        value={inlineFirst}
                        onChange={e => setInlineFirst(e.target.value)}
                        placeholder="Kwame"
                        autoFocus
                        className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-medium text-warm-700 mb-1 block">
                        Last name <span className="text-warm-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={inlineLast}
                        onChange={e => setInlineLast(e.target.value)}
                        placeholder="Asante"
                        className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-medium text-warm-700 mb-1 block">
                      Phone <span className="text-error-fg">*</span>
                    </label>
                    <input
                      type="tel"
                      value={inlinePhone}
                      onChange={e => setInlinePhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInlineCreate()}
                      placeholder="024 123 4567"
                      className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                    />
                  </div>
                  {inlineError && (
                    <p className="text-caption text-error-fg">{inlineError}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleInlineCreate}
                      isPending={inlineIsPending}
                      disabled={inlineIsPending}
                    >
                      Save customer
                    </Button>
                    <button
                      type="button"
                      className="text-caption text-warm-500 hover:text-warm-800"
                      onClick={() => setShowInlineCreate(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Priority */}
        {allowExpressOrders && (
          <div>
            <p className="text-label font-medium text-warm-700 mb-2">Priority</p>
            <div className="flex rounded-[8px] p-1" style={{ background: '#F1ECE4' }}>
              {(['normal', 'express', 'urgent'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 rounded-[6px] text-[14px] capitalize transition-colors ${
                    priority === p
                      ? 'bg-white font-semibold text-warm-950 shadow-sm'
                      : 'font-medium text-[#6B6259] hover:text-warm-800'
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pickup date */}
        <Input
          type="date"
          label="Pickup date (optional)"
          value={pickupDate}
          onChange={e => setPickupDate(e.target.value)}
        />

        {/* Line items */}
        <section>
          <p className="text-label font-medium text-warm-700 mb-3">Items</p>

          {/* Desktop grid header */}
          <div
            className="hidden md:grid items-center mb-1 px-1"
            style={{ gridTemplateColumns: '1.2fr 1.2fr 0.8fr 0.9fr 1fr 40px', gap: '10px' }}
          >
            {['Service', 'Item type', 'Qty / kg', 'Unit price', 'Line total', ''].map((h, i) => (
              <span key={i} className="text-caption text-warm-500 font-medium">{h}</span>
            ))}
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => {
              const availableItemTypes = getAvailableItemTypes(line.serviceId)
              // Weight-based service with per-item exceptions priced (e.g. a suit priced
              // individually) — offer a way to add that as its own line, regardless of
              // the laundry's overall pricing-model setting.
              const canAddException = line.pricingMode === 'per_kg' && availableItemTypes.length > 0
              return (
                <div key={i}>
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid items-center"
                    style={{ gridTemplateColumns: '1.2fr 1.2fr 0.8fr 0.9fr 1fr 40px', gap: '10px' }}
                  >
                    <SearchableSelect
                      value={line.serviceId}
                      onChange={v => updateLine(i, { serviceId: v })}
                      options={usableServices.map(s => ({ value: s.id, label: s.name }))}
                      placeholder="Select service…"
                    />
                    <div>
                      {line.pricingMode === 'per_kg' ? (
                        <span className="text-caption text-warm-400 italic">Priced by weight</span>
                      ) : (
                        <SearchableSelect
                          value={line.itemTypeId}
                          onChange={v => updateLine(i, { itemTypeId: v })}
                          options={availableItemTypes.map(t => ({ value: t.id, label: t.name }))}
                          disabled={!line.serviceId}
                          placeholder="Select item…"
                        />
                      )}
                    </div>
                    {/* Qty stepper (per_item) or weight input (per_kg) */}
                    {line.pricingMode === 'per_kg' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0.1"
                          value={line.quantity}
                          onChange={e => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-16 border border-warm-300 rounded-7 px-2 py-2 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand focus:shadow-focus-ring"
                        />
                        <span className="text-caption text-warm-500">kg</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center border border-warm-300 rounded-7 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })}
                          className="w-9 h-9 flex items-center justify-center text-warm-600 hover:bg-warm-100 text-lg leading-none"
                        >
                          −
                        </button>
                        <span className="tnum w-8 text-center text-ui font-medium text-warm-950">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateLine(i, { quantity: line.quantity + 1 })}
                          className="w-9 h-9 flex items-center justify-center text-warm-600 hover:bg-warm-100 text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    )}
                    {/* Unit price — static for a fixed price, a required bounded input for a range */}
                    <div>
                      {line.priceMin !== null && line.priceMax !== null && line.priceMin !== line.priceMax ? (
                        <input
                          type="number"
                          step="0.01"
                          min={line.priceMin}
                          max={line.priceMax}
                          value={line.unitPrice ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            const parsed = parseFloat(v)
                            updateLine(i, { unitPrice: v === '' || isNaN(parsed) ? null : parsed })
                          }}
                          placeholder={`${line.priceMin.toFixed(2)}–${line.priceMax.toFixed(2)}`}
                          className={`w-full border rounded-7 px-2.5 py-2 text-ui text-warm-950 text-right tnum focus:outline-none focus:shadow-focus-ring ${
                            line.unitPrice !== null && (line.unitPrice < line.priceMin || line.unitPrice > line.priceMax)
                              ? 'border-error-fg' : 'border-warm-400 focus:border-brand'
                          }`}
                        />
                      ) : (
                        <span className="tnum text-ui text-warm-950">
                          {line.unitPrice !== null ? formatCurrency(line.unitPrice) : '—'}
                        </span>
                      )}
                    </div>
                    <span className="tnum text-ui font-medium text-warm-950">
                      {line.totalPrice > 0 ? formatCurrency(line.totalPrice) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      className="w-8 h-8 flex items-center justify-center text-warm-400 hover:text-error-fg disabled:opacity-0 rounded-6 hover:bg-[#FDF1EF] transition-colors"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </div>
                  {line.priceMin !== null && line.priceMax !== null && line.priceMin !== line.priceMax && (
                    <p className="hidden md:block mt-1 px-1 text-caption text-warm-500">
                      Range {formatPriceRange(line.priceMin, line.priceMax)}{line.priceNotes ? ` · ${line.priceNotes}` : ''}
                    </p>
                  )}

                  {/* Mobile card */}
                  <div className="md:hidden bg-white border border-warm-300 rounded-10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-caption text-warm-500 mb-1">Service</p>
                        <SearchableSelect
                          value={line.serviceId}
                          onChange={v => updateLine(i, { serviceId: v })}
                          options={usableServices.map(s => ({ value: s.id, label: s.name }))}
                          placeholder="Select…"
                        />
                      </div>
                      <div>
                        <p className="text-caption text-warm-500 mb-1">Item type</p>
                        {line.pricingMode === 'per_kg' ? (
                          <p className="text-[14px] text-warm-400 italic py-2">Priced by weight</p>
                        ) : (
                          <SearchableSelect
                            value={line.itemTypeId}
                            onChange={v => updateLine(i, { itemTypeId: v })}
                            options={availableItemTypes.map(t => ({ value: t.id, label: t.name }))}
                            disabled={!line.serviceId}
                            placeholder="Select…"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {line.pricingMode === 'per_kg' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0.1"
                            value={line.quantity}
                            onChange={e => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-16 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                          />
                          <span className="text-caption text-warm-500">kg</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center border border-warm-300 rounded-10 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })}
                            className="w-11 h-11 flex items-center justify-center text-brand text-lg leading-none"
                          >−</button>
                          <span className="tnum w-9 text-center text-ui font-bold text-warm-950">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateLine(i, { quantity: line.quantity + 1 })}
                            className="w-11 h-11 flex items-center justify-center text-brand text-lg leading-none"
                          >+</button>
                        </div>
                      )}
                      <span className="tnum text-ui font-semibold text-warm-950">
                        {line.totalPrice > 0 ? formatCurrency(line.totalPrice) : '—'}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-caption text-warm-400 hover:text-error-fg"
                        >Remove</button>
                      )}
                    </div>
                    {line.priceMin !== null && line.priceMax !== null && line.priceMin !== line.priceMax && (
                      <div className="pt-1">
                        <p className="text-caption text-warm-500 mb-1">
                          Unit price — range {formatPriceRange(line.priceMin, line.priceMax)}{line.priceNotes ? ` · ${line.priceNotes}` : ''}
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          min={line.priceMin}
                          max={line.priceMax}
                          value={line.unitPrice ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            const parsed = parseFloat(v)
                            updateLine(i, { unitPrice: v === '' || isNaN(parsed) ? null : parsed })
                          }}
                          placeholder={`${line.priceMin.toFixed(2)}–${line.priceMax.toFixed(2)}`}
                          className={`w-full border rounded-7 px-3 py-2 text-ui text-warm-950 text-right tnum focus:outline-none ${
                            line.unitPrice !== null && (line.unitPrice < line.priceMin || line.unitPrice > line.priceMax)
                              ? 'border-error-fg' : 'border-warm-400 focus:border-brand'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {canAddException && (
                    <button
                      type="button"
                      onClick={() => addExceptionLine(line.serviceId)}
                      className="mt-1.5 px-1 text-caption text-brand hover:text-brand-hover underline underline-offset-2"
                    >
                      + Add an exception item
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add another item */}
          <button
            type="button"
            onClick={addLine}
            className="mt-3 w-full py-2.5 border border-dashed border-warm-400 rounded-10 text-label font-medium text-warm-600 hover:border-brand hover:text-brand transition-colors"
          >
            + Add another item
          </button>
        </section>

        {/* Notes */}
        <Textarea
          label="Notes (optional)"
          placeholder="Special instructions or care notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Pay in advance */}
      <section className="bg-white border border-warm-300 rounded-10 px-5 py-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-ui font-medium text-warm-950">Customer is paying now</p>
            <p className="text-caption text-warm-600 mt-0.5">
              {payInAdvance ? `${formatCurrency(total)} will be recorded on order creation` : 'Payment recorded at collection'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={payInAdvance}
            onClick={() => setPayInAdvance(p => !p)}
            className={`relative flex-shrink-0 w-10 rounded-full transition-colors duration-200 ${payInAdvance ? 'bg-brand' : 'bg-warm-300'}`}
            style={{ minWidth: '2.5rem', height: '1.375rem' }}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${payInAdvance ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </label>
        {payInAdvance && (
          <div className="mt-3 pt-3 border-t border-warm-200">
            <label className="text-label font-medium text-warm-700 mb-1.5 block">Payment method</label>
            <select
              value={advanceMethod}
              onChange={e => setAdvanceMethod(e.target.value as PaymentMethod)}
              className="w-full border border-warm-400 rounded-7 px-3 py-[10px] text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Order summary — a normal section at the end of the form (not fixed
          to the viewport), so it doesn't fight the on-screen keyboard on
          mobile the way a position:fixed bar does. */}
      <div
        className="mt-6 bg-white border border-[#E8E4DD] rounded-10 px-[22px] py-[14px]"
        style={{ boxShadow: '0 8px 28px rgba(15,61,46,0.10)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-caption text-warm-600">
              {validLines.length} item{validLines.length !== 1 ? 's' : ''}
            </span>
            {pickupDate && (
              <span className="text-caption text-warm-600 ml-3">· Pickup {pickupDate}</span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="tnum text-[20px] font-semibold text-warm-950">
              {formatCurrency(total)}
            </span>
            <Button
              variant="primary"
              isPending={isPending}
              disabled={!canSubmit || isPending}
              onClick={handleSubmit}
            >
              Create Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
