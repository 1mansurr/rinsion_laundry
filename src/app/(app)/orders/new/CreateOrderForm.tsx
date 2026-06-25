'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder, type CreateOrderInput } from '@/services/orders'
import type { ItemType } from '@/services/items'
import type { LaundryService } from '@/services/services'
import type { PriceCell } from '@/services/pricing'
import type { Customer } from '@/services/customers'
import type { OrderPriority } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'

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
}

const EMPTY_LINE: LineItem = { itemTypeId: '', serviceId: '', quantity: 1, unitPrice: 0, totalPrice: 0 }

export function CreateOrderForm({ itemTypes, services, prices, customers, branches, isAdmin, defaultBranchId, preselectedCustomer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [customerSearch, setCustomerSearch] = useState(
    preselectedCustomer ? `${preselectedCustomer.firstName} ${preselectedCustomer.lastName}` : ''
  )
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer ?? null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [branchId, setBranchId] = useState(defaultBranchId)
  const [priority, setPriority] = useState<OrderPriority>('normal')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  const filteredCustomers = customerSearch.length >= 1
    ? customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 8)
    : []

  function getUnitPrice(itemTypeId: string, serviceId: string): number {
    return prices.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId && p.isActive)?.price ?? 0
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines(prev => {
      const next = prev.map((l, i) => {
        if (i !== index) return l
        const updated = { ...l, ...patch }
        const unitPrice = (patch.itemTypeId !== undefined || patch.serviceId !== undefined)
          ? getUnitPrice(updated.itemTypeId, updated.serviceId)
          : updated.unitPrice
        return { ...updated, unitPrice, totalPrice: unitPrice * updated.quantity }
      })
      return next
    })
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }

  const total = lines.reduce((s, l) => s + l.totalPrice, 0)
  const canSubmit = selectedCustomer && lines.every(l => l.itemTypeId && l.serviceId && l.quantity > 0)

  function handleSubmit() {
    if (!selectedCustomer || !canSubmit) return
    setError(null)

    const input: CreateOrderInput = {
      customerId: selectedCustomer.id,
      branchId,
      priority,
      pickupDate: pickupDate || undefined,
      notes: notes || undefined,
      items: lines.filter(l => l.itemTypeId && l.serviceId),
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
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Customer */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
        {selectedCustomer ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
              <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
            </div>
            <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="text-xs text-gray-400 hover:text-gray-700">Change</button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Search by name or phone…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(`${c.firstName} ${c.lastName}`); setShowCustomerDropdown(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {showCustomerDropdown && customerSearch.length >= 1 && filteredCustomers.length === 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
                <p className="text-sm text-gray-500">No customer found.</p>
                <a href="/customers/new" className="text-sm text-gray-900 underline">Create new customer →</a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Order info */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {isAdmin && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as OrderPriority)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="normal">Normal</option>
              <option value="express">Express</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={e => setPickupDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Items</h2>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <select
                  value={line.itemTypeId}
                  onChange={e => updateLine(i, { itemTypeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Item type…</option>
                  {itemTypes.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <select
                  value={line.serviceId}
                  onChange={e => updateLine(i, { serviceId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Service…</option>
                  {services.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="number" min="1" value={line.quantity}
                  onChange={e => updateLine(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="col-span-1 text-right text-xs text-gray-500 tabular-nums">
                {line.unitPrice > 0 ? formatCurrency(line.totalPrice) : '—'}
              </div>
              <div className="col-span-1 text-right">
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 text-sm">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLine} className="mt-3 text-sm text-gray-500 hover:text-gray-900">+ Add item</button>

        {/* Notes */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Special instructions, damage notes…"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>
      </section>

      {/* Summary + submit */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">{lines.filter(l => l.itemTypeId).length} item(s)</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending || !canSubmit}
          className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating order…' : 'Create Order'}
        </button>
        {!selectedCustomer && <p className="text-xs text-gray-400 text-center mt-2">Select a customer to continue</p>}
      </section>
    </div>
  )
}
