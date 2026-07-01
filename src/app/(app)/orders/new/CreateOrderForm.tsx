'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder, type CreateOrderInput } from '@/services/orders'
import { createCustomer } from '@/services/customers'
import type { ItemType } from '@/services/items'
import type { LaundryService } from '@/services/services'
import type { PriceCell } from '@/services/pricing'
import type { Customer } from '@/services/customers'
import type { OrderPriority } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

interface Branch { id: string; name: string }

interface LineItem {
  itemTypeId: string
  serviceId: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Props {
  itemTypes: ItemType[]
  services: LaundryService[]
  prices: PriceCell[]
  customers: Customer[]
  branches: Branch[]
  isAdmin: boolean
  defaultBranchId: string
  preselectedCustomer?: Customer | null
  allowExpressOrders?: boolean
}

const EMPTY_LINE: LineItem = { itemTypeId: '', serviceId: '', quantity: 1, unitPrice: 0, totalPrice: 0 }

const PRIORITY_LABELS: Record<OrderPriority, string> = {
  normal: 'Normal',
  express: 'Express',
  urgent: 'Urgent',
}

export function CreateOrderForm({
  itemTypes, services, prices, customers, branches,
  isAdmin, defaultBranchId, preselectedCustomer,
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
  const [branchId, setBranchId] = useState(defaultBranchId)
  const [priority, setPriority] = useState<OrderPriority>('normal')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

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

  const pricedItems = itemTypes.filter(t =>
    t.isActive && prices.some(p => p.itemTypeId === t.id && p.isActive)
  )

  function getUnitPrice(itemTypeId: string, serviceId: string) {
    return prices.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId && p.isActive)?.price ?? 0
  }

  function getAvailableServices(itemTypeId: string) {
    if (!itemTypeId) return services.filter(s => s.isActive)
    return services.filter(s =>
      s.isActive && prices.some(p => p.itemTypeId === itemTypeId && p.serviceId === s.id && p.isActive)
    )
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, ...patch }
      if (patch.itemTypeId !== undefined) {
        const avail = getAvailableServices(patch.itemTypeId)
        if (updated.serviceId && !avail.some(s => s.id === updated.serviceId)) updated.serviceId = ''
        if (!updated.serviceId && avail.length === 1) updated.serviceId = avail[0].id
      }
      const unitPrice = (patch.itemTypeId !== undefined || patch.serviceId !== undefined)
        ? getUnitPrice(updated.itemTypeId, updated.serviceId)
        : updated.unitPrice
      return { ...updated, unitPrice, totalPrice: unitPrice * updated.quantity }
    }))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)) }

  const total = lines.reduce((s, l) => s + l.totalPrice, 0)
  const validLines = lines.filter(l => l.itemTypeId && l.serviceId && l.quantity > 0)
  const canSubmit = !!selectedCustomer && validLines.length > 0

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
      branchId,
      priority,
      pickupDate: pickupDate || undefined,
      notes: notes || undefined,
      items: validLines,
    }
    startTransition(async () => {
      const res = await createOrder(input)
      if (res.success) {
        router.push(`/orders/${res.data.orderId}`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="relative pb-28">
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
                  {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
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
                          {c.firstName[0]}{c.lastName[0]}
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

        {/* Branch (admin only) + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isAdmin && (
            <Select
              label="Branch"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          )}

          {allowExpressOrders && (
            <div className={isAdmin ? '' : 'sm:col-span-2'}>
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
        </div>

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
            style={{ gridTemplateColumns: '1.3fr 1.3fr 0.9fr 1fr 40px', gap: '10px' }}
          >
            {['Item type', 'Service', 'Qty', 'Line total', ''].map((h, i) => (
              <span key={i} className="text-caption text-warm-500 font-medium">{h}</span>
            ))}
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => {
              const availableServices = getAvailableServices(line.itemTypeId)
              return (
                <div key={i}>
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid items-center"
                    style={{ gridTemplateColumns: '1.3fr 1.3fr 0.9fr 1fr 40px', gap: '10px' }}
                  >
                    <select
                      value={line.itemTypeId}
                      onChange={e => updateLine(i, { itemTypeId: e.target.value })}
                      className="w-full border border-warm-400 rounded-7 px-3 py-[10px] text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring appearance-none"
                    >
                      <option value="">Select item…</option>
                      {pricedItems.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      value={line.serviceId}
                      onChange={e => updateLine(i, { serviceId: e.target.value })}
                      disabled={!line.itemTypeId}
                      className="w-full border border-warm-400 rounded-7 px-3 py-[10px] text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring appearance-none disabled:opacity-40"
                    >
                      <option value="">Select service…</option>
                      {availableServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {/* Qty stepper */}
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

                  {/* Mobile card */}
                  <div className="md:hidden bg-white border border-warm-300 rounded-10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-caption text-warm-500 mb-1">Item type</p>
                        <select
                          value={line.itemTypeId}
                          onChange={e => updateLine(i, { itemTypeId: e.target.value })}
                          className="w-full border border-warm-400 rounded-7 px-2.5 py-2 text-[14px] text-warm-950 bg-white focus:outline-none focus:border-brand"
                        >
                          <option value="">Select…</option>
                          {pricedItems.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-caption text-warm-500 mb-1">Service</p>
                        <select
                          value={line.serviceId}
                          onChange={e => updateLine(i, { serviceId: e.target.value })}
                          disabled={!line.itemTypeId}
                          className="w-full border border-warm-400 rounded-7 px-2.5 py-2 text-[14px] text-warm-950 bg-white focus:outline-none focus:border-brand disabled:opacity-40"
                        >
                          <option value="">Select…</option>
                          {availableServices.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center border border-warm-300 rounded-7 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })}
                          className="w-8 h-8 flex items-center justify-center text-warm-600 hover:bg-warm-100"
                        >−</button>
                        <span className="tnum w-8 text-center text-ui font-medium text-warm-950">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateLine(i, { quantity: line.quantity + 1 })}
                          className="w-8 h-8 flex items-center justify-center text-warm-600 hover:bg-warm-100"
                        >+</button>
                      </div>
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
                  </div>
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

      {/* Sticky summary footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pb-4 pointer-events-none">
        <div className="max-w-[800px] mx-auto pointer-events-auto">
          <div
            className="bg-white border border-[#E8E4DD] rounded-10 px-[22px] py-[14px]"
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
      </div>
    </div>
  )
}
