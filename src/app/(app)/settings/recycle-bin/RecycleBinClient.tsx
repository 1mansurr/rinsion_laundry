'use client'

import { useState, useTransition } from 'react'
import { restoreCustomer } from '@/services/customers/restoreCustomer'
import { restoreOrder } from '@/services/orders/restoreOrder'
import { restoreItemType } from '@/services/items/restoreItemType'
import { restoreService } from '@/services/services/restoreService'
import type { DeletedCustomer } from '@/services/customers/getDeletedCustomers'
import type { DeletedOrder } from '@/services/orders/getDeletedOrders'
import type { DeletedItemType } from '@/services/items/getDeletedItemTypes'
import type { DeletedService } from '@/services/services/getDeletedServices'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTimeAgo } from '@/utils/formatTimeAgo'

interface Props {
  customers: DeletedCustomer[]
  orders: DeletedOrder[]
  itemTypes: DeletedItemType[]
  services: DeletedService[]
}

type Tab = 'customers' | 'orders' | 'itemTypes' | 'services'

const TAB_LABELS: Record<Tab, string> = {
  customers: 'Customers',
  orders: 'Orders',
  itemTypes: 'Item Types',
  services: 'Services',
}

export function RecycleBinClient({ customers: initCustomers, orders: initOrders, itemTypes: initItemTypes, services: initServices }: Props) {
  const [tab, setTab] = useState<Tab>('customers')
  const [customers, setCustomers] = useState(initCustomers)
  const [orders, setOrders] = useState(initOrders)
  const [itemTypes, setItemTypes] = useState(initItemTypes)
  const [services, setServices] = useState(initServices)
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleRestoreCustomer(id: string) {
    setErrors(prev => ({ ...prev, [id]: '' }))
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreCustomer(id)
      if (res.success) setCustomers(prev => prev.filter(c => c.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  function handleRestoreOrder(id: string) {
    setErrors(prev => ({ ...prev, [id]: '' }))
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreOrder(id)
      if (res.success) setOrders(prev => prev.filter(o => o.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  function handleRestoreItemType(id: string) {
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreItemType(id)
      if (res.success) setItemTypes(prev => prev.filter(i => i.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  function handleRestoreService(id: string) {
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreService(id)
      if (res.success) setServices(prev => prev.filter(s => s.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  const counts: Record<Tab, number> = {
    customers: customers.length,
    orders: orders.length,
    itemTypes: itemTypes.length,
    services: services.length,
  }

  return (
    <div>
      <div className="flex border-b border-warm-200 mb-4">
        {(['customers', 'orders', 'itemTypes', 'services'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-ui font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand text-warm-950' : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            {TAB_LABELS[t]} {counts[t] > 0 && <span className="text-warm-400">({counts[t]})</span>}
          </button>
        ))}
      </div>

      <div className="bg-white border border-warm-300 rounded-10 divide-y divide-warm-100">
        {tab === 'customers' && (
          customers.length === 0 ? (
            <p className="text-ui text-warm-500 text-center py-8">Nothing here.</p>
          ) : (
            customers.map(c => (
              <div key={c.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui font-medium text-warm-950">{c.firstName} {c.lastName}</p>
                    <p className="text-caption text-warm-500">{c.phone} · Deleted {formatTimeAgo(c.deletedAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreCustomer(c.id)}
                    disabled={isPending && restoringId === c.id}
                    className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {errors[c.id] && <p className="text-caption text-error-fg mt-1">{errors[c.id]}</p>}
              </div>
            ))
          )
        )}

        {tab === 'orders' && (
          orders.length === 0 ? (
            <p className="text-ui text-warm-500 text-center py-8">Nothing here.</p>
          ) : (
            orders.map(o => (
              <div key={o.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui font-medium text-warm-950">{o.orderNumber} · {o.customerName}</p>
                    <p className="text-caption text-warm-500">
                      {formatCurrency(o.total)} · {o.status} · Deleted {formatTimeAgo(o.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreOrder(o.id)}
                    disabled={isPending && restoringId === o.id}
                    className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {errors[o.id] && <p className="text-caption text-error-fg mt-1">{errors[o.id]}</p>}
              </div>
            ))
          )
        )}

        {tab === 'itemTypes' && (
          itemTypes.length === 0 ? (
            <p className="text-ui text-warm-500 text-center py-8">Nothing here.</p>
          ) : (
            itemTypes.map(i => (
              <div key={i.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui font-medium text-warm-950">{i.name}</p>
                    <p className="text-caption text-warm-500">Deleted {formatTimeAgo(i.deletedAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreItemType(i.id)}
                    disabled={isPending && restoringId === i.id}
                    className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {errors[i.id] && <p className="text-caption text-error-fg mt-1">{errors[i.id]}</p>}
              </div>
            ))
          )
        )}

        {tab === 'services' && (
          services.length === 0 ? (
            <p className="text-ui text-warm-500 text-center py-8">Nothing here.</p>
          ) : (
            services.map(s => (
              <div key={s.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui font-medium text-warm-950">{s.name}</p>
                    <p className="text-caption text-warm-500">Deleted {formatTimeAgo(s.deletedAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreService(s.id)}
                    disabled={isPending && restoringId === s.id}
                    className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {errors[s.id] && <p className="text-caption text-error-fg mt-1">{errors[s.id]}</p>}
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
