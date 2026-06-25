'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus } from '@/services/orders'
import { recordPayment } from '@/services/payments/recordPayment'
import { ORDER_STATUS_TRANSITIONS, PAYMENT_METHODS, type OrderStatus } from '@/constants/statuses'
import type { PaymentMethod } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'

interface Props {
  orderId: string
  currentStatus: OrderStatus
  total: number
  amountPaid: number
}

export function OrderActions({ orderId, currentStatus, total, amountPaid }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  const nextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus] ?? []
  const balance = total - amountPaid

  function handleStatusUpdate(newStatus: OrderStatus) {
    setError(null)
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus)
      if (!res.success) setError(res.error)
    })
  }

  function handleRecordPayment() {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return
    setError(null)
    startTransition(async () => {
      const res = await recordPayment({ orderId, amount, paymentMethod })
      if (res.success) {
        setShowPaymentForm(false)
        setPaymentAmount('')
      } else {
        setError(res.error)
      }
    })
  }

  const STATUS_LABELS: Record<string, string> = {
    confirmed: 'Mark Confirmed', processing: 'Mark Processing',
    ready: 'Mark Ready', collected: 'Mark Collected', cancelled: 'Cancel Order',
  }

  const STATUS_STYLES: Record<string, string> = {
    confirmed: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    processing: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ready: 'bg-green-600 text-white hover:bg-green-700',
    collected: 'bg-gray-900 text-white hover:bg-gray-800',
    cancelled: 'border border-red-200 text-red-600 hover:bg-red-50',
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Payment */}
      {currentStatus !== 'cancelled' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
          </div>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="text-gray-900 font-medium">{formatCurrency(total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-700 font-medium">{formatCurrency(amountPaid)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1"><span className="text-gray-700 font-medium">Balance</span><span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(balance)}</span></div>
          </div>

          {!showPaymentForm ? (
            balance > 0 && (
              <button
                onClick={() => { setShowPaymentForm(true); setPaymentAmount(balance.toFixed(2)) }}
                className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Record Payment
              </button>
            )
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500">GHS</span>
                <input
                  type="number" step="0.01" min="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleRecordPayment} disabled={isPending}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Saving…' : 'Save Payment'}
                </button>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="px-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status transitions */}
      {nextStatuses.length > 0 && (
        <div className="space-y-2">
          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => handleStatusUpdate(s)}
              disabled={isPending}
              className={`w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${STATUS_STYLES[s] ?? 'border border-gray-300 text-gray-700'}`}
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
