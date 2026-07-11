'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateOrderStatus } from '@/services/orders/updateOrderStatus'
import { verifyAndCollect } from '@/services/orders/verifyAndCollect'
import { recordPayment } from '@/services/payments/recordPayment'
import { recordRefund } from '@/services/payments/recordRefund'
import { resendPickupCodeSms } from '@/services/notifications/resendPickupCodeSms'
import { createOrderNote } from '@/services/orders/createOrderNote'
import { setOrderItemPieces } from '@/services/orders/setOrderItemPieces'
import { PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTimeAgo } from '@/utils/formatTimeAgo'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'
import { StatusBadge } from '@/components/app/StatusBadge'
import { toast } from '@/components/ui/Toast'

export interface OrderDetailNote {
  id: string
  note: string
  createdAt: string
  authorName: string
}

export interface OrderDetailPayment {
  id: string
  amount: number
  paymentMethod: string
  createdAt: string
}

export interface OrderDetailRefund {
  id: string
  amount: number
  refundMethod: string
  reason: string | null
  createdAt: string
}

export interface OrderItemPieceRow {
  id: string
  itemTypeId: string
  itemTypeName: string
  quantity: number
}

export interface OrderDetailItem {
  id: string
  /** Piece count when pricingMode is 'per_item', weight in kg when 'per_kg' */
  quantity: number
  unitPrice: number
  totalPrice: number
  pricingMode: 'per_item' | 'per_kg'
  itemTypeName: string
  serviceName: string
  /** Optional contents breakdown for a per_kg line — pure tracking, never priced */
  pieces: OrderItemPieceRow[]
}

export interface OrderDetailActivity {
  id: string
  description: string
  createdAt: string
  employeeName: string
}

interface Props {
  orderId: string
  orderNumber: string
  status: OrderStatus
  priority: string
  pickupCode: string
  pickupDate: string | null
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  customerName: string
  customerId: string
  customerPhone: string
  branchName: string
  createdAt: string
  cancelledAt: string | null
  previousStatusOnCancel: string | null
  items: OrderDetailItem[]
  itemTypes: { id: string; name: string }[]
  payments: OrderDetailPayment[]
  refunds: OrderDetailRefund[]
  notes: OrderDetailNote[]
  activities: OrderDetailActivity[]
}

const STEPS: OrderStatus[] = ['received', 'confirmed', 'processing', 'ready', 'collected']
const STEP_LABELS: Record<string, string> = {
  received: 'Received', confirmed: 'Confirmed', processing: 'Processing',
  ready: 'Ready', collected: 'Collected',
}
const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'confirmed', confirmed: 'processing', processing: 'ready',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', mobile_money: 'Mobile Money', card: 'Card', bank_transfer: 'Bank Transfer',
}

export function OrderDetail({
  orderId, orderNumber, status, priority, pickupCode, pickupDate, subtotal, taxAmount, total, amountPaid,
  customerName, customerId, customerPhone, branchName, createdAt, cancelledAt,
  previousStatusOnCancel, items: initItems, itemTypes, payments, refunds: initRefunds, notes: initNotes, activities,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Action modals
  const [collectOpen, setCollectOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Collect form
  const [collectCode, setCollectCode] = useState('')
  const [collectError, setCollectError] = useState('')

  // Payment form
  const balance = total - amountPaid
  const [payStep, setPayStep] = useState<'code' | 'payment'>('payment')
  const [payCodeEntry, setPayCodeEntry] = useState('')
  const [payCodeError, setPayCodeError] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mobile_money')
  const [payError, setPayError] = useState('')

  // Refund form — refundable is capped at the net amount currently paid
  const [refunds, setRefunds] = useState(initRefunds)
  const refundable = amountPaid
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('mobile_money')
  const [refundReason, setRefundReason] = useState('')
  const [refundError, setRefundError] = useState('')

  // Notes
  const [notes, setNotes] = useState(initNotes)
  const [noteText, setNoteText] = useState('')
  const [noteError, setNoteError] = useState('')
  const [addingNote, startNoteTransition] = useTransition()

  // Order items (local copy so pieces breakdown edits can update in place)
  const [items, setItems] = useState(initItems)

  // Pieces breakdown modal (per_kg lines only)
  const [piecesModalItemId, setPiecesModalItemId] = useState<string | null>(null)
  const [piecesDraft, setPiecesDraft] = useState<{ itemTypeId: string; quantity: number }[]>([])
  const [piecesError, setPiecesError] = useState('')
  const [savingPieces, startPiecesTransition] = useTransition()

  // Activity collapsed
  const [activityOpen, setActivityOpen] = useState(status === 'cancelled')

  const isCancelled = status === 'cancelled'
  const isCollected = status === 'collected'
  const isActive = !isCancelled && !isCollected
  const currentStepIdx = STEPS.indexOf(status)

  function handleCollect() {
    if (collectCode.length !== 6) return
    setCollectError('')
    startTransition(async () => {
      const res = await verifyAndCollect(orderId, collectCode)
      if (res.success) {
        toast.success('Order collected')
        setCollectOpen(false)
        router.refresh()
      } else {
        setCollectError(res.error)
      }
    })
  }

  function openPaymentModal() {
    setPayError('')
    setPayCodeError('')
    setPayCodeEntry('')
    setPayStep(status === 'ready' ? 'code' : 'payment')
    setPaymentOpen(true)
  }

  function handlePayCodeSubmit() {
    if (payCodeEntry.trim().toLowerCase() !== pickupCode.trim().toLowerCase()) {
      setPayCodeError('Incorrect pickup code. Try again.')
      return
    }
    setPayStep('payment')
  }

  function handlePayment() {
    setPayError('')
    startTransition(async () => {
      const res = await recordPayment({ orderId, amount: balance, paymentMethod: payMethod })
      if (!res.success) { setPayError(res.error ?? 'Failed to record payment'); return }

      if (status === 'ready') {
        await verifyAndCollect(orderId, payCodeEntry)
        toast.success('Payment recorded — order collected')
      } else {
        toast.success('Payment recorded')
      }
      setPaymentOpen(false)
      router.refresh()
    })
  }

  function openRefundModal() {
    setRefundError('')
    setRefundAmount(refundable.toFixed(2))
    setRefundMethod('mobile_money')
    setRefundReason('')
    setRefundOpen(true)
  }

  function handleRefund() {
    const amount = parseFloat(refundAmount)
    if (!amount || amount <= 0) { setRefundError('Enter a valid amount.'); return }
    if (amount > refundable) { setRefundError(`Cannot refund more than ${formatCurrency(refundable)}.`); return }
    setRefundError('')
    startTransition(async () => {
      const res = await recordRefund({ orderId, amount, refundMethod, reason: refundReason || undefined })
      if (!res.success) { setRefundError(res.error ?? 'Failed to record refund'); return }
      setRefunds(prev => [...prev, {
        id: crypto.randomUUID(),
        amount,
        refundMethod,
        reason: refundReason || null,
        createdAt: new Date().toISOString(),
      }])
      toast.success('Refund recorded')
      setRefundOpen(false)
      router.refresh()
    })
  }

  function handleAdvanceStatus() {
    const next = STATUS_NEXT[status]
    if (!next) return
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, next)
      if (!res.success) toast.error(res.error)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, 'cancelled')
      if (res.success) {
        setCancelOpen(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleAddNote() {
    if (!noteText.trim()) return
    setNoteError('')
    startNoteTransition(async () => {
      const res = await createOrderNote(orderId, noteText.trim())
      if (res.success) {
        setNotes(prev => [...prev, {
          id: crypto.randomUUID(),
          note: noteText.trim(),
          createdAt: new Date().toISOString(),
          authorName: 'You',
        }])
        setNoteText('')
      } else {
        setNoteError(res.error)
      }
    })
  }

  function openPiecesModal(item: OrderDetailItem) {
    setPiecesError('')
    setPiecesDraft(
      item.pieces.length > 0
        ? item.pieces.map(p => ({ itemTypeId: p.itemTypeId, quantity: p.quantity }))
        : [{ itemTypeId: itemTypes[0]?.id ?? '', quantity: 1 }]
    )
    setPiecesModalItemId(item.id)
  }

  function addPieceRow() {
    setPiecesDraft(prev => [...prev, { itemTypeId: itemTypes[0]?.id ?? '', quantity: 1 }])
  }

  function updatePieceRow(index: number, patch: Partial<{ itemTypeId: string; quantity: number }>) {
    setPiecesDraft(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function removePieceRow(index: number) {
    setPiecesDraft(prev => prev.filter((_, i) => i !== index))
  }

  function savePieces() {
    if (!piecesModalItemId) return
    setPiecesError('')
    const valid = piecesDraft.filter(p => p.itemTypeId && p.quantity > 0)
    startPiecesTransition(async () => {
      const res = await setOrderItemPieces(orderId, piecesModalItemId, valid)
      if (!res.success) { setPiecesError(res.error ?? 'Failed to save contents'); return }
      setItems(prev => prev.map(it => it.id !== piecesModalItemId ? it : {
        ...it,
        pieces: valid.map(p => ({
          id: crypto.randomUUID(),
          itemTypeId: p.itemTypeId,
          itemTypeName: itemTypes.find(t => t.id === p.itemTypeId)?.name ?? '—',
          quantity: p.quantity,
        })),
      }))
      setPiecesModalItemId(null)
    })
  }

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-6 lg:px-7 lg:py-7">
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-caption text-warm-500 hover:text-warm-900 mb-5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Orders
      </Link>

      {/* Cancelled banner */}
      {isCancelled && cancelledAt && (
        <div className="mb-5">
          <Banner variant="destructive">
            This order was cancelled on{' '}
            {new Date(cancelledAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
            {previousStatusOnCancel ? ` while in ${previousStatusOnCancel} status` : ''}.
          </Banner>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-4 min-w-0">

          {/* Order header card */}
          <div className="bg-white border border-warm-300 rounded-10 p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h1 className="tnum text-[20px] font-bold text-warm-950">{orderNumber}</h1>
                  <StatusBadge status={status} />
                  {priority !== 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label font-medium bg-[#F3EFF8] text-[#6B3FA0] capitalize">
                      {priority}
                    </span>
                  )}
                </div>
                <p className="text-caption text-warm-500">
                  {new Date(createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {pickupDate && <span className="ml-3">· Pickup by {pickupDate}</span>}
                </p>
              </div>

              {/* Pickup code — desktop: large ring, mobile: plain */}
              <div className="shrink-0">
                {/* Desktop ring */}
                <div className="hidden md:flex flex-col items-center gap-1.5">
                  <div className="relative inline-flex items-center justify-center" style={{ width: 128, height: 128 }}>
                    <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
                      <circle
                        cx="64" cy="64" r="46"
                        stroke="#E8E4DD"
                        strokeWidth="2.5"
                        strokeDasharray="92 8"
                        fill="none"
                        transform="rotate(-77 64 64)"
                      />
                    </svg>
                    <span
                      className="tnum absolute font-bold text-brand"
                      style={{ fontSize: 30, letterSpacing: '0.14em' }}
                    >
                      {pickupCode}
                    </span>
                  </div>
                  <span className="text-caption text-warm-500">Pickup code</span>
                </div>
                {/* Mobile: compact */}
                <div className="md:hidden text-right">
                  <p className="text-caption text-warm-500 mb-0.5">Pickup code</p>
                  <span className="tnum text-[22px] font-bold tracking-[0.12em] text-brand">{pickupCode}</span>
                </div>
              </div>
            </div>

            {/* Progress stepper */}
            <div className="mt-6">
              {isCancelled ? (
                <CancelledStepper previousStatus={previousStatusOnCancel} />
              ) : (
                <ProgressStepper currentIdx={currentStepIdx} />
              )}
            </div>
          </div>

          {/* Action bar */}
          {!isCancelled && !isCollected && (
            <div className="flex flex-wrap items-center gap-2">
              {status === 'ready' ? (
                balance > 0 ? (
                  <Button variant="accent" onClick={openPaymentModal} isPending={isPending}>
                    Record Payment
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setCollectOpen(true)} disabled={isPending}>
                    Mark Collected
                  </Button>
                )
              ) : (
                <>
                  {STATUS_NEXT[status] && (
                    <Button variant="primary" onClick={handleAdvanceStatus} isPending={isPending}>
                      Mark {STEP_LABELS[STATUS_NEXT[status]!]}
                    </Button>
                  )}
                  {balance > 0 && (
                    <Button variant="accent" onClick={openPaymentModal} disabled={isPending}>
                      Record Payment
                    </Button>
                  )}
                </>
              )}

              <Button variant="secondary" disabled>
                Edit
              </Button>

              <div className="relative ml-auto">
                <Button
                  variant="ghost"
                  onClick={() => setShowMoreMenu(p => !p)}
                  aria-label="More actions"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                  </svg>
                </Button>
                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-warm-300 rounded-10 shadow-modal min-w-[160px] overflow-hidden">
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-ui text-error-fg hover:bg-[#FDF1EF]"
                        onClick={() => { setShowMoreMenu(false); setCancelOpen(true) }}
                      >
                        Cancel Order
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Refund — available on any order with money still held, most relevant right after cancellation */}
          {refundable > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={isCancelled ? 'accent' : 'secondary'} onClick={openRefundModal} isPending={isPending}>
                Record Refund
              </Button>
            </div>
          )}

          {/* Customer */}
          <div className="bg-white border border-warm-300 rounded-10 p-5">
            <h2 className="text-label font-semibold text-warm-500 uppercase tracking-wider mb-3">Customer</h2>
            <Link href={`/customers/${customerId}`} className="group flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-warm-200 text-[14px] font-semibold text-warm-700 shrink-0">
                {customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
              <div>
                <p className="text-ui font-medium text-warm-950 group-hover:underline">{customerName}</p>
                <p className="text-caption text-warm-500">{customerPhone}</p>
              </div>
            </Link>
            {branchName && (
              <p className="text-caption text-warm-400 mt-2">Branch: {branchName}</p>
            )}
          </div>

          {/* Items */}
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-warm-200">
              <h2 className="text-ui font-semibold text-warm-950">Items</h2>
            </div>
            {/* Desktop grid */}
            <div className="hidden md:block">
              <div
                className="grid px-5 py-2.5 border-b border-warm-100 bg-[#F8F5F0]"
                style={{ gridTemplateColumns: '1.4fr 1.1fr 60px 1fr', gap: '12px' }}
              >
                {['Item', 'Service', 'Qty', 'Total'].map(h => (
                  <span key={h} className="text-caption font-medium text-warm-500">{h}</span>
                ))}
              </div>
              {items.map(item => (
                <div key={item.id} className="border-b border-warm-50 last:border-0">
                  <div
                    className="grid px-5 py-3"
                    style={{ gridTemplateColumns: '1.4fr 1.1fr 60px 1fr', gap: '12px' }}
                  >
                    <span className="text-ui text-warm-950">
                      {item.pricingMode === 'per_kg' ? item.serviceName : item.itemTypeName}
                    </span>
                    <span className="text-ui text-warm-600">
                      {item.pricingMode === 'per_kg' ? 'Priced by weight' : item.serviceName}
                    </span>
                    <span className="tnum text-ui text-warm-600">
                      {item.quantity}{item.pricingMode === 'per_kg' ? ' kg' : ''}
                    </span>
                    <span className="tnum text-ui font-medium text-warm-950">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  {item.pricingMode === 'per_kg' && (
                    <div className="px-5 pb-2.5 -mt-1">
                      <button
                        type="button"
                        onClick={() => openPiecesModal(item)}
                        className="text-caption text-brand hover:text-brand-hover underline underline-offset-2"
                      >
                        {item.pieces.length > 0
                          ? item.pieces.map(p => `${p.quantity} ${p.itemTypeName}`).join(' · ')
                          : '+ Add contents'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Mobile list */}
            <div className="md:hidden divide-y divide-warm-100">
              {items.map(item => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ui text-warm-950">
                        {item.pricingMode === 'per_kg' ? item.serviceName : item.itemTypeName}
                      </p>
                      <p className="text-caption text-warm-500">
                        {item.pricingMode === 'per_kg'
                          ? `${item.quantity} kg`
                          : `${item.serviceName} × ${item.quantity}`}
                      </p>
                    </div>
                    <span className="tnum text-ui font-medium text-warm-950">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  {item.pricingMode === 'per_kg' && (
                    <button
                      type="button"
                      onClick={() => openPiecesModal(item)}
                      className="mt-1.5 text-caption text-brand hover:text-brand-hover underline underline-offset-2"
                    >
                      {item.pieces.length > 0
                        ? item.pieces.map(p => `${p.quantity} ${p.itemTypeName}`).join(' · ')
                        : '+ Add contents'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-[#F8F5F0] border-t border-warm-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-ui text-warm-700">Subtotal</span>
                <span className="tnum text-ui text-warm-900">{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ui text-warm-700">Tax</span>
                  <span className="tnum text-ui text-warm-900">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-ui font-semibold text-warm-900">Total</span>
                <span className="tnum text-ui font-bold text-warm-950">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-warm-200">
                <h2 className="text-ui font-semibold text-warm-950">Payments</h2>
                <span className={`tnum text-label font-medium ${balance <= 0 ? 'text-success-fg' : 'text-error-fg'}`}>
                  {balance <= 0 ? 'Paid in full' : `${formatCurrency(balance)} outstanding`}
                </span>
              </div>
              <div className="divide-y divide-warm-100">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-ui text-warm-900">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                      </p>
                      <p className="text-caption text-warm-400">{formatTimeAgo(p.createdAt)}</p>
                    </div>
                    <span className="tnum text-ui font-medium text-success-fg">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refunds */}
          {refunds.length > 0 && (
            <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-warm-200">
                <h2 className="text-ui font-semibold text-warm-950">Refunds</h2>
              </div>
              <div className="divide-y divide-warm-100">
                {refunds.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-ui text-warm-900">
                        {PAYMENT_METHOD_LABELS[r.refundMethod] ?? r.refundMethod}
                      </p>
                      <p className="text-caption text-warm-400">
                        {formatTimeAgo(r.createdAt)}{r.reason ? ` · ${r.reason}` : ''}
                      </p>
                    </div>
                    <span className="tnum text-ui font-medium text-error-fg">
                      -{formatCurrency(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-warm-200">
              <h2 className="text-ui font-semibold text-warm-950">Notes</h2>
            </div>
            <div className="divide-y divide-warm-100">
              {notes.length === 0 && (
                <p className="px-5 py-4 text-body text-warm-400">No notes yet.</p>
              )}
              {notes.map(n => (
                <div key={n.id} className="px-5 py-3">
                  <p className="text-ui text-warm-900">{n.note}</p>
                  <p className="text-caption text-warm-400 mt-0.5">
                    {n.authorName && `${n.authorName} · `}{formatTimeAgo(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            {isActive && (
              <div className="px-5 py-3 border-t border-warm-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Add a note…"
                    className="flex-1 border border-warm-400 rounded-7 px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddNote}
                    isPending={addingNote}
                    disabled={!noteText.trim() || addingNote}
                  >
                    Add
                  </Button>
                </div>
                {noteError && <p className="text-caption text-error-fg mt-1">{noteError}</p>}
              </div>
            )}
          </div>

          {/* Activity history */}
          {activities.length > 0 && (
            <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-warm-200 text-left"
                onClick={() => setActivityOpen(p => !p)}
              >
                <h2 className="text-ui font-semibold text-warm-950">Activity</h2>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-warm-400 transition-transform ${activityOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {activityOpen && (
                <div className="divide-y divide-warm-100">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start justify-between px-5 py-3 gap-4">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-warm-300 shrink-0" />
                        <div>
                          <p className="text-ui text-warm-900">{a.description}</p>
                          {a.employeeName && <p className="text-caption text-warm-500">{a.employeeName}</p>}
                        </div>
                      </div>
                      <span className="text-caption text-warm-400 whitespace-nowrap">{formatTimeAgo(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — desktop summary */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-white border border-warm-300 rounded-10 p-5 space-y-3">
            {taxAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-label text-warm-500">Tax</span>
                <span className="tnum text-ui font-medium text-warm-950">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-label text-warm-500">Total</span>
              <span className="tnum text-ui font-semibold text-warm-950">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-warm-500">Paid</span>
              <span className="tnum text-ui font-medium text-success-fg">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-warm-200 pt-3">
              <span className="text-label font-semibold text-warm-900">Balance</span>
              <span className={`tnum text-ui font-bold ${balance > 0 ? 'text-error-fg' : 'text-success-fg'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          {isActive && balance > 0 && (
            <Button variant="accent" className="w-full" onClick={openPaymentModal}>
              Record Payment
            </Button>
          )}
          {status === 'ready' && balance <= 0 && (
            <Button variant="primary" className="w-full" onClick={() => setCollectOpen(true)}>
              Mark Collected
            </Button>
          )}
          {isActive && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setCancelOpen(true)}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Mark Collected modal */}
      <Modal
        open={collectOpen}
        onClose={() => { setCollectOpen(false); setCollectCode(''); setCollectError('') }}
        title="Confirm Collection"
        description={`${orderNumber} · ${customerName}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-label font-medium text-warm-700 mb-2">Enter the 6-character pickup code</p>
            <input
              type="text"
              maxLength={6}
              value={collectCode}
              onChange={e => { setCollectCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setCollectError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCollect()}
              placeholder="······"
              autoFocus
              className={`w-full border rounded-7 py-3 text-center tnum text-[22px] font-bold tracking-[0.18em] text-warm-950 placeholder:text-warm-300 focus:outline-none focus:shadow-focus-ring ${
                collectError ? 'border-error-fg' : 'border-warm-400 focus:border-brand'
              }`}
            />
            {collectError && <p className="text-caption text-error-fg mt-1.5">{collectError}</p>}
          </div>
          <button
            type="button"
            className="text-caption text-brand underline underline-offset-2 hover:text-brand-hover"
            onClick={async () => {
              const res = await resendPickupCodeSms(orderId)
              if (res.success) toast.success('SMS sent')
              else toast.error(res.error)
            }}
          >
            Resend SMS to customer
          </button>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setCollectOpen(false); setCollectCode('') }}>Cancel</Button>
            <Button
              variant="primary"
              isPending={isPending}
              disabled={collectCode.length !== 5 || isPending}
              onClick={handleCollect}
            >
              Collect Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment modal — 2-step for ready orders */}
      <Modal
        open={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPayError(''); setPayCodeError('') }}
        title={payStep === 'code' ? 'Verify Customer' : 'Record Payment'}
        description={payStep === 'code' ? `${orderNumber} · ${customerName}` : `${orderNumber} · Balance ${formatCurrency(balance)}`}
      >
        {payStep === 'code' ? (
          <div className="space-y-4">
            <p className="text-label font-medium text-warm-700">Enter the customer&apos;s 6-character pickup code</p>
            <input
              type="text"
              maxLength={6}
              value={payCodeEntry}
              onChange={e => { setPayCodeEntry(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setPayCodeError('') }}
              onKeyDown={e => e.key === 'Enter' && handlePayCodeSubmit()}
              placeholder="······"
              autoFocus
              className={`w-full border rounded-7 py-3 text-center tnum text-[22px] font-bold tracking-[0.18em] text-warm-950 placeholder:text-warm-300 focus:outline-none focus:shadow-focus-ring ${
                payCodeError ? 'border-error-fg' : 'border-warm-400 focus:border-brand'
              }`}
            />
            {payCodeError && <p className="text-caption text-error-fg">{payCodeError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={payCodeEntry.length !== 6}
                onClick={handlePayCodeSubmit}
              >
                Verify
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#F8F5F0] rounded-7 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-label text-warm-500">Total</span>
                <span className="tnum text-ui font-medium text-warm-950">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label text-warm-500">Paid</span>
                <span className="tnum text-ui font-medium text-success-fg">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-warm-200 pt-1.5">
                <span className="text-label font-semibold text-warm-900">Outstanding</span>
                <span className="tnum text-ui font-bold text-error-fg">{formatCurrency(balance)}</span>
              </div>
            </div>
            <div className="bg-[#F8F5F0] rounded-7 px-4 py-3 flex items-center justify-between">
              <span className="text-label text-warm-600">Amount due</span>
              <span className="tnum text-ui font-bold text-error-fg">{formatCurrency(balance)}</span>
            </div>
            <div>
              <label className="text-label font-medium text-warm-700 mb-1.5 block">Payment method</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full border border-warm-400 rounded-7 px-3 py-[10px] text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</option>
                ))}
              </select>
            </div>
            {payError && <p className="text-caption text-error-fg">{payError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button variant="accent" isPending={isPending} disabled={isPending} onClick={handlePayment}>
                {status === 'ready' ? 'Confirm Payment & Collect' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel order modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Order"
        description={`Are you sure you want to cancel ${orderNumber}? This cannot be undone.`}
      >
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep Order</Button>
          <Button variant="destructive" filled isPending={isPending} onClick={handleCancel}>
            Cancel Order
          </Button>
        </div>
      </Modal>

      {/* Record Refund modal */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Record Refund"
        description={`${orderNumber} · ${customerName} · Up to ${formatCurrency(refundable)} refundable`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={refundable}
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              className="w-full border border-warm-400 rounded-7 px-3 py-2 text-ui text-warm-950 tnum focus:outline-none focus:border-brand focus:shadow-focus-ring"
            />
          </div>
          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">Refund method</label>
            <select
              value={refundMethod}
              onChange={e => setRefundMethod(e.target.value as PaymentMethod)}
              className="w-full border border-warm-400 rounded-7 px-3 py-[10px] text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">Reason (optional)</label>
            <input
              type="text"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="e.g. Order cancelled after payment"
              className="w-full border border-warm-400 rounded-7 px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 focus:outline-none focus:border-brand focus:shadow-focus-ring"
            />
          </div>
          {refundError && <p className="text-caption text-error-fg">{refundError}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button variant="destructive" filled isPending={isPending} disabled={isPending} onClick={handleRefund}>
              Record Refund
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contents breakdown modal (per_kg lines only) — optional, never affects price */}
      {(() => {
        const activeItem = items.find(it => it.id === piecesModalItemId)
        if (!activeItem) return null
        return (
          <Modal
            open
            onClose={() => setPiecesModalItemId(null)}
            title={`Contents — ${activeItem.serviceName} (${activeItem.quantity} kg)`}
            description="Optional — track what's inside this batch. Doesn't affect price."
          >
            <div className="space-y-3">
              {piecesDraft.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.itemTypeId}
                    onChange={e => updatePieceRow(i, { itemTypeId: e.target.value })}
                    className="flex-1 border border-warm-400 rounded-7 px-3 py-2 text-ui text-warm-950 bg-white focus:outline-none focus:border-brand focus:shadow-focus-ring"
                  >
                    {itemTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <div className="inline-flex items-center border border-warm-300 rounded-7 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => updatePieceRow(i, { quantity: Math.max(1, row.quantity - 1) })}
                      className="w-8 h-8 flex items-center justify-center text-warm-600 hover:bg-warm-100"
                    >−</button>
                    <span className="tnum w-8 text-center text-ui font-medium text-warm-950">{row.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updatePieceRow(i, { quantity: row.quantity + 1 })}
                      className="w-8 h-8 flex items-center justify-center text-warm-600 hover:bg-warm-100"
                    >+</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePieceRow(i)}
                    aria-label="Remove"
                    className="w-8 h-8 shrink-0 flex items-center justify-center text-warm-400 hover:text-error-fg"
                  >×</button>
                </div>
              ))}

              <button
                type="button"
                onClick={addPieceRow}
                className="w-full py-2 border border-dashed border-warm-400 rounded-10 text-label font-medium text-warm-600 hover:border-brand hover:text-brand transition-colors"
              >
                + Add item
              </button>

              {piecesError && <p className="text-caption text-error-fg">{piecesError}</p>}

              <div className="flex gap-3 justify-end pt-1">
                <Button variant="secondary" onClick={() => setPiecesModalItemId(null)}>Cancel</Button>
                <Button variant="primary" isPending={savingPieces} disabled={savingPieces} onClick={savePieces}>
                  Save
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

function ProgressStepper({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <Fragment key={step}>
          {i > 0 && (
            <div
              className="flex-1 h-px mx-1"
              style={{
                background: i <= currentIdx
                  ? '#0F3D2E'
                  : 'repeating-linear-gradient(90deg,#E0DAD0 0 6px,transparent 6px 12px)',
              }}
            />
          )}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              i < currentIdx ? 'bg-brand border-brand' :
              i === currentIdx ? 'border-brand bg-white' :
              'border-warm-300 bg-white'
            }`}>
              {i < currentIdx && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {i === currentIdx && <div className="w-2 h-2 rounded-full bg-brand" />}
            </div>
            <span className={`text-[11px] capitalize hidden sm:block ${
              i <= currentIdx ? 'text-brand font-medium' : 'text-warm-400'
            }`}>
              {STEP_LABELS[step]}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function CancelledStepper({ previousStatus }: { previousStatus: string | null }) {
  const label = previousStatus
    ? `Cancelled at ${STEP_LABELS[previousStatus] ?? previousStatus}`
    : 'Cancelled'
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full border-2 border-warm-300 bg-white shrink-0" />
      <div
        className="flex-1 h-px"
        style={{ background: 'repeating-linear-gradient(90deg,#E0DAD0 0 6px,transparent 6px 12px)' }}
      />
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-6 h-6 rounded-full border-2 border-[#E0BBB6] bg-[#FDF1EF] flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2L2 8" stroke="#C25A3C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-[11px] text-error-fg font-medium whitespace-nowrap">{label}</span>
      </div>
    </div>
  )
}
