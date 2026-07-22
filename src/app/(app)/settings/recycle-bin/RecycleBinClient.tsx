'use client'

import { useState, useTransition } from 'react'
import { restoreCustomer } from '@/services/customers/restoreCustomer'
import { restoreOrder } from '@/services/orders/restoreOrder'
import { restoreItemType } from '@/services/items/restoreItemType'
import { restoreService } from '@/services/services/restoreService'
import { restoreEmployee } from '@/services/employees/restoreEmployee'
import type { DeletedCustomer } from '@/services/customers/getDeletedCustomers'
import type { DeletedOrder } from '@/services/orders/getDeletedOrders'
import type { DeletedItemType } from '@/services/items/getDeletedItemTypes'
import type { DeletedService } from '@/services/services/getDeletedServices'
import type { DeletedEmployee } from '@/services/employees/getDeletedEmployees'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTimeAgo } from '@/utils/formatTimeAgo'

interface Props {
  customers: DeletedCustomer[]
  orders: DeletedOrder[]
  itemTypes: DeletedItemType[]
  services: DeletedService[]
  employees: DeletedEmployee[]
}

type Tab = 'customers' | 'orders' | 'itemTypes' | 'services' | 'employees'

const TAB_LABELS: Record<Tab, string> = {
  customers: 'Customers',
  orders: 'Orders',
  itemTypes: 'Item Types',
  services: 'Services',
  employees: 'Employees',
}

export function RecycleBinClient({
  customers: initCustomers, orders: initOrders, itemTypes: initItemTypes, services: initServices, employees: initEmployees,
}: Props) {
  const [tab, setTab] = useState<Tab>('customers')
  const [customers, setCustomers] = useState(initCustomers)
  const [orders, setOrders] = useState(initOrders)
  const [itemTypes, setItemTypes] = useState(initItemTypes)
  const [services, setServices] = useState(initServices)
  const [employees, setEmployees] = useState(initEmployees)
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
    setErrors(prev => ({ ...prev, [id]: '' }))
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreItemType(id)
      if (res.success) setItemTypes(prev => prev.filter(i => i.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  function handleRestoreService(id: string) {
    setErrors(prev => ({ ...prev, [id]: '' }))
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreService(id)
      if (res.success) setServices(prev => prev.filter(s => s.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  function handleRestoreEmployee(id: string) {
    setErrors(prev => ({ ...prev, [id]: '' }))
    setRestoringId(id)
    startTransition(async () => {
      const res = await restoreEmployee(id)
      if (res.success) setEmployees(prev => prev.filter(e => e.id !== id))
      else setErrors(prev => ({ ...prev, [id]: res.error }))
      setRestoringId(null)
    })
  }

  const counts: Record<Tab, number> = {
    customers: customers.length,
    orders: orders.length,
    itemTypes: itemTypes.length,
    services: services.length,
    employees: employees.length,
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {(['customers', 'orders', 'itemTypes', 'services', 'employees'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-ui-sm font-semibold border transition-colors ${
              tab === t ? 'bg-brand text-[#FAF8F5] border-brand' : 'bg-white text-warm-800 border-warm-300 hover:bg-warm-100'
            }`}
          >
            {TAB_LABELS[t]}
            <span className={`tnum text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/20 text-[#FAF8F5]' : 'bg-warm-150 text-warm-600'}`}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-warm-300 rounded-18 divide-y divide-warm-100">
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

        {tab === 'employees' && (
          employees.length === 0 ? (
            <p className="text-ui text-warm-500 text-center py-8">Nothing here.</p>
          ) : (
            employees.map(e => (
              <div key={e.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ui font-medium text-warm-950">
                      {e.firstName || e.lastName ? `${e.firstName} ${e.lastName}` : '(no name set)'}
                    </p>
                    <p className="text-caption text-warm-500 capitalize">
                      {e.role} · Removed {formatTimeAgo(e.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreEmployee(e.id)}
                    disabled={isPending && restoringId === e.id}
                    className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {errors[e.id] && <p className="text-caption text-error-fg mt-1">{errors[e.id]}</p>}
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
