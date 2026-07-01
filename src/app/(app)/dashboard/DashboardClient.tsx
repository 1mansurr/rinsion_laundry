'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { verifyAndCollect } from '@/services/orders/verifyAndCollect'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { OMark } from '@/components/ui/OMark'
import { StatCard } from '@/components/app/StatCard'
import { toast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTimeAgo, formatReadySince } from '@/utils/formatTimeAgo'

export interface ReadyOrder {
  id: string
  orderNumber: string
  pickupCode: string
  customerName: string
  phone: string
  branchName: string
  readySince: string
  balance: number
}

export interface ActivityEntry {
  id: string
  description: string
  actionType: string
  createdAt: string
  employeeName: string
}

interface Props {
  profile: { firstName: string; role: string; branchId: string; laundryName: string }
  readyOrders: ReadyOrder[]
  isFirstTime: boolean
  adminStats?: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number }
  activities: ActivityEntry[]
  showSmsBanner: boolean
  smsUsed: number
  smsQuota: number
  subscriptionStatus: string | null
  todayDate: string
}

export function DashboardClient({
  profile,
  readyOrders,
  isFirstTime,
  adminStats,
  activities,
  showSmsBanner,
  smsUsed,
  smsQuota,
  subscriptionStatus,
  todayDate,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [collectingOrder, setCollectingOrder] = useState<ReadyOrder | null>(null)
  const [collectCode, setCollectCode] = useState('')
  const [collectError, setCollectError] = useState('')

  const [smsDismissed, setSmsDismissed] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

  const isLocked = subscriptionStatus === 'locked' || subscriptionStatus === 'hard_block'

  function openCollect(order: ReadyOrder) {
    setCollectingOrder(order)
    setCollectCode('')
    setCollectError('')
  }

  function closeCollect() {
    setCollectingOrder(null)
    setCollectCode('')
    setCollectError('')
  }

  function handleCollect() {
    if (!collectingOrder || collectCode.length !== 5) return
    setCollectError('')
    startTransition(async () => {
      const res = await verifyAndCollect(collectingOrder.id, collectCode)
      if (res.success) {
        toast.success(`${collectingOrder.orderNumber} collected`)
        closeCollect()
        router.refresh()
      } else {
        setCollectError(res.error)
      }
    })
  }

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <OMark size={64} variant="muted-red" />
        <div>
          <h2 className="text-[22px] font-semibold text-warm-950 mb-2">
            {subscriptionStatus === 'hard_block' ? 'Account in read-only mode' : 'Subscription expired'}
          </h2>
          <p className="text-body text-warm-600 max-w-sm mx-auto">
            {subscriptionStatus === 'hard_block'
              ? 'New orders are paused. Renew to restore full access.'
              : 'All operations are paused. Renew your subscription to continue.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="accent" size="lg" onClick={() => router.push('/settings/subscription')}>
            Pay now
          </Button>
          <Button variant="secondary" size="lg">Contact Rinsion</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      {/* SMS overage banner */}
      {showSmsBanner && !smsDismissed && (
        <div className="mb-4">
          <Banner variant="warning" dismissable onDismiss={() => setSmsDismissed(true)}>
            You&apos;ve used {Math.round((smsUsed / smsQuota) * 100)}% of this month&apos;s SMS allowance
            ({smsUsed}/{smsQuota}).
            {smsUsed > smsQuota && ` ${smsUsed - smsQuota} overage messages this cycle.`}
          </Banner>
        </div>
      )}

      {/* First-time setup banner */}
      {isFirstTime && !onboardingDismissed && (
        <div className="mb-4">
          <Banner variant="success" dismissable onDismiss={() => setOnboardingDismissed(true)}>
            You&apos;re all set up! Create your first order to get started.
          </Banner>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[26px] font-semibold text-warm-950 leading-tight">{profile.laundryName}</h1>
          <p className="text-body text-warm-600 mt-0.5">{todayDate}</p>
        </div>
        <Link href="/orders/new">
          <Button variant="primary" size="sm">+ New Order</Button>
        </Link>
      </div>

      {/* Ready for collection hero panel */}
      <div className="bg-white border border-warm-300 rounded-10 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-warm-200">
          <div className="flex items-center gap-2.5">
            <h2 className="text-ui font-semibold text-warm-950">Ready for collection</h2>
            {readyOrders.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-[11px] font-semibold text-[#FAF8F5]">
                {readyOrders.length}
              </span>
            )}
          </div>
          <Link href="/orders?status=ready" className="text-caption text-warm-600 hover:text-brand transition-colors">
            View all orders
          </Link>
        </div>

        {readyOrders.length === 0 ? (
          <div className="py-12">
            {isFirstTime ? (
              <EmptyState
                headline="No orders yet"
                body="Create your first order to start managing collections."
                action={{ label: 'New order', onClick: () => router.push('/orders/new') }}
              />
            ) : (
              <EmptyState headline="All caught up" body="No orders waiting for collection right now." />
            )}
          </div>
        ) : (
          <div>
            {/* Desktop column headers */}
            <div
              className="hidden md:grid items-center px-[22px] py-2 border-b border-warm-100"
              style={{ gridTemplateColumns: '1.4fr 0.9fr 1fr auto', gap: '18px' }}
            >
              <span className="text-caption text-warm-500 font-medium">Customer</span>
              <span className="text-caption text-warm-500 font-medium">Pickup code</span>
              <span className="text-caption text-warm-500 font-medium">Ready since</span>
              <span className="w-[148px]" />
            </div>

            <div className="divide-y divide-warm-100">
              {readyOrders.map(order => (
                <div key={order.id} className="px-[22px] py-[15px]">
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-ui font-medium text-warm-950">{order.customerName}</p>
                        <p className="text-caption text-warm-500">
                          {order.phone}{order.branchName ? ` · ${order.branchName}` : ''}
                        </p>
                      </div>
                      <span className="tnum text-[18px] font-bold tracking-[0.08em] text-brand leading-none shrink-0">
                        {order.pickupCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-warm-500">{formatReadySince(order.readySince)}</span>
                      {order.balance > 0 ? (
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="accent" size="sm">Record Payment</Button>
                        </Link>
                      ) : (
                        <Button variant="accent" size="sm" onClick={() => openCollect(order)}>
                          Mark Collected
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div
                    className="hidden md:grid items-center"
                    style={{ gridTemplateColumns: '1.4fr 0.9fr 1fr auto', gap: '18px' }}
                  >
                    <div>
                      <p className="text-ui font-medium text-warm-950">{order.customerName}</p>
                      <p className="text-caption text-warm-500">
                        {order.phone}{order.branchName ? ` · ${order.branchName}` : ''}
                      </p>
                    </div>
                    <span className="tnum text-[18px] font-bold tracking-[0.08em] text-brand">
                      {order.pickupCode}
                    </span>
                    <span className="text-body text-warm-600">{formatReadySince(order.readySince)}</span>
                    {order.balance > 0 ? (
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="accent" size="sm">Record Payment</Button>
                      </Link>
                    ) : (
                      <Button variant="accent" size="sm" onClick={() => openCollect(order)}>
                        Mark Collected
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin stats + recent activity */}
      {adminStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats column */}
          <div className="space-y-3">
            <StatCard label="Orders today" value={adminStats.ordersToday} />
            <StatCard
              label="Outstanding payments"
              value={formatCurrency(adminStats.outstandingBalance)}
            />
            <StatCard
              label="Active customers this week"
              value={adminStats.activeCustomersThisWeek}
            />
          </div>

          {/* Activity feed */}
          <div className="lg:col-span-2 bg-white border border-warm-300 rounded-10 overflow-hidden">
            <div className="px-5 py-4 border-b border-warm-200">
              <h2 className="text-ui font-semibold text-warm-950">Recent activity</h2>
            </div>
            <div className="divide-y divide-warm-100">
              {activities.length === 0 && (
                <p className="text-body text-warm-500 text-center py-8">No recent activity.</p>
              )}
              {activities.map(activity => (
                <div key={activity.id} className="flex items-start justify-between px-5 py-3 gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-[5px] w-2 h-2 rounded-full shrink-0"
                      style={{ background: activityDotColor(activity.actionType) }}
                    />
                    <div>
                      <p className="text-ui text-warm-900">{activity.description}</p>
                      {activity.employeeName && (
                        <p className="text-caption text-warm-500">{activity.employeeName}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-caption text-warm-400 whitespace-nowrap shrink-0">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mark Collected modal */}
      <Modal
        open={collectingOrder !== null}
        onClose={closeCollect}
        title="Confirm Collection"
        description={
          collectingOrder
            ? `${collectingOrder.orderNumber} · ${collectingOrder.customerName}`
            : undefined
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-label font-medium text-warm-700 mb-2">
              Enter the 5-digit pickup code
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={collectCode}
              onChange={e => {
                setCollectCode(e.target.value.replace(/\D/g, ''))
                setCollectError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleCollect()}
              placeholder="·····"
              autoFocus
              className={`w-full border rounded-7 py-3 text-center tnum text-[22px] font-bold tracking-[0.18em] text-warm-950 placeholder:text-warm-300 focus:outline-none focus:shadow-focus-ring transition-shadow ${
                collectError
                  ? 'border-error-fg focus:border-error-fg'
                  : 'border-warm-400 focus:border-brand'
              }`}
            />
            {collectError && (
              <p className="text-caption text-error-fg mt-1.5">{collectError}</p>
            )}
          </div>

          <button
            type="button"
            className="text-caption text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            Resend SMS to customer
          </button>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={closeCollect} disabled={isPending}>
              Cancel
            </Button>
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
    </div>
  )
}

function activityDotColor(actionType: string): string {
  const colors: Record<string, string> = {
    ORDER_CREATED: '#0F3D2E',
    PAYMENT_RECORDED: '#2E7D5B',
    STATUS_UPDATED: '#2F6F9E',
  }
  return colors[actionType] ?? '#CDC7BD'
}
