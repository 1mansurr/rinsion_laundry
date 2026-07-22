'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { searchForPickup } from '@/services/orders/searchForPickup'
import { getOrderBalance } from '@/services/orders/getOrderBalance'
import { verifyAndCollect } from '@/services/orders/verifyAndCollect'
import { recordPayment } from '@/services/payments/recordPayment'
import type { OrderListItem } from '@/services/orders/getOrders'
import { PAYMENT_METHODS, type PaymentMethod } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

export function PickupFlow() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OrderListItem[] | null>(null)
  const [selected, setSelected] = useState<OrderListItem | null>(null)
  const [balance, setBalance] = useState<{ total: number; amountPaid: number } | null>(null)
  const [pickupCode, setPickupCode] = useState('')
  const [collectError, setCollectError] = useState<string | null>(null)
  const [collectSuccess, setCollectSuccess] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    startTransition(async () => {
      const res = await searchForPickup(query.trim())
      setResults(res)
      setSelected(null)
      setBalance(null)
    })
  }

  function handleSelect(order: OrderListItem) {
    setSelected(order)
    setBalance(null)
    setPickupCode('')
    setCollectError(null)
    setCollectSuccess(false)
    setShowPaymentForm(false)
    setPaymentError(null)
    startTransition(async () => {
      const b = await getOrderBalance(order.id)
      setBalance(b)
    })
  }

  function handleRecordPayment() {
    if (!selected || !balance) return
    const owing = balance.total - balance.amountPaid
    if (owing <= 0) return
    setPaymentError(null)
    startTransition(async () => {
      const res = await recordPayment({ orderId: selected.id, amount: owing, paymentMethod })
      if (res.success) {
        setShowPaymentForm(false)
        const b = await getOrderBalance(selected.id)
        setBalance(b)
      } else {
        setPaymentError(res.error)
      }
    })
  }

  function handleCollect() {
    if (!selected) return
    setCollectError(null)
    startTransition(async () => {
      const res = await verifyAndCollect(selected.id, pickupCode)
      if (res.success) {
        setCollectSuccess(true)
        setResults(prev =>
          prev?.map(o => o.id === selected.id ? { ...o, status: 'collected' as const } : o) ?? null
        )
      } else {
        setCollectError(res.error)
      }
    })
  }

  const owing = balance ? Math.max(0, balance.total - balance.amountPaid) : 0

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Order number, pickup code, or customer phone…"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={!query.trim()} isPending={isPending && !selected}>
          Search
        </Button>
      </form>

      {/* Results list */}
      {results !== null && !selected && results.length === 0 && (
        <p className="text-sm text-warm-600 text-center py-6">No orders found.</p>
      )}

      {results !== null && results.length > 0 && !selected && (
        <div className="bg-white rounded-18 border border-warm-300 divide-y divide-warm-100">
          {results.map(order => (
            <button
              key={order.id}
              onClick={() => handleSelect(order)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-warm-50 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-warm-950 font-mono">{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-warm-600 mt-0.5">{order.customerName} · {order.customerPhone}</p>
              </div>
              <span className="text-sm text-warm-950 font-medium ml-4">{formatCurrency(order.total)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Verify panel */}
      {selected && (
        <div className="bg-white rounded-18 border border-warm-300">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-warm-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-warm-950 font-mono">{selected.orderNumber}</span>
              <StatusBadge status={collectSuccess ? 'collected' : selected.status} />
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-warm-600 hover:text-warm-800"
            >
              ← Back
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Customer */}
            <div>
              <p className="text-sm font-medium text-warm-950">{selected.customerName}</p>
              <p className="text-xs text-warm-600">{selected.customerPhone}</p>
            </div>

            {/* Balance */}
            {balance === null ? (
              <p className="text-sm text-warm-600">Loading…</p>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-warm-600">Total</span>
                  <span className="text-warm-950 font-medium">{formatCurrency(balance.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-600">Paid</span>
                  <span className="text-success-fg font-medium">{formatCurrency(balance.amountPaid)}</span>
                </div>
                {owing > 0 && (
                  <div className="flex justify-between border-t border-warm-100 pt-1">
                    <span className="text-warm-800 font-semibold">Balance due</span>
                    <span className="text-error font-bold">{formatCurrency(owing)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment form (when balance outstanding) */}
            {balance !== null && owing > 0 && !collectSuccess && (
              !showPaymentForm ? (
                <Button variant="destructive" className="w-full" onClick={() => setShowPaymentForm(true)}>
                  Record Payment ({formatCurrency(owing)})
                </Button>
              ) : (
                <div className="space-y-2">
                  {paymentError && <p className="text-sm text-error">{paymentError}</p>}
                  <Select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </Select>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleRecordPayment} isPending={isPending}>
                      {`Confirm ${formatCurrency(owing)}`}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            )}

            {/* Pickup code verification */}
            {selected.status === 'ready' && !collectSuccess && balance !== null && owing === 0 && (
              <div className="space-y-3 pt-2 border-t border-warm-100">
                <Input
                  label="Customer's Pickup Code"
                  value={pickupCode}
                  onChange={e => setPickupCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2"
                  maxLength={8}
                  className="font-mono uppercase tracking-widest"
                  autoFocus
                />
                {collectError && (
                  <p className="text-sm text-error">{collectError}</p>
                )}
                <Button className="w-full" onClick={handleCollect} disabled={!pickupCode.trim()} isPending={isPending}>
                  Mark Collected
                </Button>
              </div>
            )}

            {/* Order not ready */}
            {selected.status !== 'ready' && !collectSuccess && (
              <p className="text-sm text-warm-600 text-center py-2">
                {selected.status === 'collected'
                  ? 'This order has already been collected.'
                  : `Order is ${selected.status} — not yet ready for pickup.`}
              </p>
            )}

            {/* Success */}
            {collectSuccess && (
              <Banner variant="success" className="text-center block">
                <p className="text-sm font-semibold">Order collected successfully</p>
                <button
                  onClick={() => { setSelected(null); setResults(null); setQuery('') }}
                  className="text-xs hover:underline mt-1.5 block mx-auto"
                >
                  Search another order
                </button>
              </Banner>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
