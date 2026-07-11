'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { searchForPickup } from '@/services/orders/searchForPickup'
import { getOrderBalance } from '@/services/orders/getOrderBalance'
import { verifyAndCollect } from '@/services/orders/verifyAndCollect'
import { recordPayment } from '@/services/payments/recordPayment'
import type { OrderListItem } from '@/services/orders/getOrders'
import { PAYMENT_METHODS, type PaymentMethod } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_STYLES: Record<string, string> = {
  received:   'bg-gray-100 text-gray-600',
  confirmed:  'bg-blue-50 text-blue-700',
  processing: 'bg-yellow-50 text-yellow-700',
  ready:      'bg-green-50 text-green-700',
  collected:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-red-50 text-red-500',
}

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
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Order number, pickup code, or customer phone…"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending && !selected ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Results list */}
      {results !== null && !selected && results.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">No orders found.</p>
      )}

      {results !== null && results.length > 0 && !selected && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {results.map(order => (
            <button
              key={order.id}
              onClick={() => handleSelect(order)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 font-mono">{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[order.status] ?? ''}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{order.customerName} · {order.customerPhone}</p>
              </div>
              <span className="text-sm text-gray-900 font-medium ml-4">{formatCurrency(order.total)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Verify panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 font-mono">{selected.orderNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[collectSuccess ? 'collected' : selected.status] ?? ''}`}>
                {collectSuccess ? 'collected' : selected.status}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Customer */}
            <div>
              <p className="text-sm font-medium text-gray-900">{selected.customerName}</p>
              <p className="text-xs text-gray-500">{selected.customerPhone}</p>
            </div>

            {/* Balance */}
            {balance === null ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(balance.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-green-700 font-medium">{formatCurrency(balance.amountPaid)}</span>
                </div>
                {owing > 0 && (
                  <div className="flex justify-between border-t border-gray-100 pt-1">
                    <span className="text-gray-700 font-semibold">Balance due</span>
                    <span className="text-red-600 font-bold">{formatCurrency(owing)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment form (when balance outstanding) */}
            {balance !== null && owing > 0 && !collectSuccess && (
              !showPaymentForm ? (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full border border-red-200 text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  Record Payment ({formatCurrency(owing)})
                </button>
              ) : (
                <div className="space-y-2">
                  {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRecordPayment}
                      disabled={isPending}
                      className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Saving…' : `Confirm ${formatCurrency(owing)}`}
                    </button>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="px-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Pickup code verification */}
            {selected.status === 'ready' && !collectSuccess && balance !== null && owing === 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Customer&apos;s Pickup Code
                  </label>
                  <input
                    type="text"
                    value={pickupCode}
                    onChange={e => setPickupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2"
                    maxLength={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono uppercase text-gray-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
                    autoFocus
                  />
                </div>
                {collectError && (
                  <p className="text-sm text-red-600">{collectError}</p>
                )}
                <button
                  onClick={handleCollect}
                  disabled={isPending || !pickupCode.trim()}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Verifying…' : 'Mark Collected'}
                </button>
              </div>
            )}

            {/* Order not ready */}
            {selected.status !== 'ready' && !collectSuccess && (
              <p className="text-sm text-gray-400 text-center py-2">
                {selected.status === 'collected'
                  ? 'This order has already been collected.'
                  : `Order is ${selected.status} — not yet ready for pickup.`}
              </p>
            )}

            {/* Success */}
            {collectSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-center">
                <p className="text-sm font-semibold text-green-800">Order collected successfully</p>
                <button
                  onClick={() => { setSelected(null); setResults(null); setQuery('') }}
                  className="text-xs text-green-700 hover:underline mt-1.5 block mx-auto"
                >
                  Search another order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
