'use client'

import { useState, useTransition } from 'react'
import { createItemType, toggleItemType, type ItemType } from '@/services/items'
import { createService, toggleService, type LaundryService } from '@/services/services'
import { upsertPrice, togglePrice, type PriceCell } from '@/services/pricing'

interface Props {
  itemTypes: ItemType[]
  services: LaundryService[]
  prices: PriceCell[]
}

export function ItemsServicesClient({ itemTypes: initItems, services: initServices, prices: initPrices }: Props) {
  const [tab, setTab] = useState<'items' | 'services' | 'pricing'>('items')
  const [items, setItems] = useState(initItems)
  const [services, setServices] = useState(initServices)
  const [prices, setPrices] = useState(initPrices)
  const [isPending, startTransition] = useTransition()
  const [newItemName, setNewItemName] = useState('')
  const [newServiceName, setNewServiceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ itemTypeId: string; serviceId: string } | null>(null)
  const [cellPrice, setCellPrice] = useState('')

  function addItem() {
    if (!newItemName.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await createItemType(newItemName.trim())
      if (res.success) { setItems(prev => [...prev, res.data]); setNewItemName('') }
      else setError(res.error)
    })
  }

  function addService() {
    if (!newServiceName.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await createService(newServiceName.trim())
      if (res.success) { setServices(prev => [...prev, res.data]); setNewServiceName('') }
      else setError(res.error)
    })
  }

  function handleToggleItem(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleItemType(id, !current)
      if (res.success) setItems(prev => prev.map(i => i.id === id ? { ...i, isActive: !current } : i))
    })
  }

  function handleToggleService(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleService(id, !current)
      if (res.success) setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !current } : s))
    })
  }

  function getPrice(itemTypeId: string, serviceId: string) {
    return prices.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId)
  }

  function savePrice(itemTypeId: string, serviceId: string) {
    const val = parseFloat(cellPrice)
    if (isNaN(val) || val < 0) { setEditingCell(null); return }
    startTransition(async () => {
      const res = await upsertPrice(itemTypeId, serviceId, val)
      if (res.success) {
        setPrices(prev => {
          const existing = prev.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId)
          if (existing) return prev.map(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId ? { ...p, price: val, isActive: true } : p)
          return [...prev, { id: '', itemTypeId, serviceId, price: val, isActive: true }]
        })
      }
      setEditingCell(null)
    })
  }

  function handleDisablePrice(itemTypeId: string, serviceId: string) {
    const cell = getPrice(itemTypeId, serviceId)
    if (!cell) return
    startTransition(async () => {
      const res = await togglePrice(cell.id, false)
      if (res.success) setPrices(prev => prev.map(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId ? { ...p, isActive: false } : p))
    })
  }

  const activeItems = items.filter(i => i.isActive)
  const activeServices = services.filter(s => s.isActive)

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['items', 'services', 'pricing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pricing' ? 'Pricing Matrix' : t === 'items' ? 'Item Types' : 'Services'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">{error}</div>
      )}

      {/* Item Types */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="e.g. Shirt, Trouser, Suit..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={addItem} disabled={isPending || !newItemName.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No item types yet.</p>}
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <span className={`text-sm ${item.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{item.name}</span>
                <button
                  onClick={() => handleToggleItem(item.id, item.isActive)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addService()}
              placeholder="e.g. Wash Only, Wash + Iron, Dry Clean..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={addService} disabled={isPending || !newServiceName.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {services.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No services yet.</p>}
            {services.map(svc => (
              <div key={svc.id} className="flex items-center justify-between px-5 py-3">
                <span className={`text-sm ${svc.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{svc.name}</span>
                <button
                  onClick={() => handleToggleService(svc.id, svc.isActive)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  {svc.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Matrix */}
      {tab === 'pricing' && (
        <div>
          {activeItems.length === 0 || activeServices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Add active item types and services first to build the pricing matrix.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm w-full">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 min-w-32">
                      Item Type
                    </th>
                    {activeServices.map(svc => (
                      <th key={svc.id} className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 min-w-28 text-center">
                        {svc.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-medium text-gray-900 bg-gray-50 border border-gray-200">{item.name}</td>
                      {activeServices.map(svc => {
                        const cell = getPrice(item.id, svc.id)
                        const isEditing = editingCell?.itemTypeId === item.id && editingCell?.serviceId === svc.id
                        const hasPrice = cell?.isActive

                        return (
                          <td key={svc.id} className="border border-gray-200 text-center p-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <span className="text-xs text-gray-500">GHS</span>
                                <input
                                  autoFocus
                                  value={cellPrice}
                                  onChange={e => setCellPrice(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') savePrice(item.id, svc.id)
                                    if (e.key === 'Escape') setEditingCell(null)
                                  }}
                                  onBlur={() => savePrice(item.id, svc.id)}
                                  className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-900 text-right focus:outline-none focus:ring-1 focus:ring-gray-900"
                                  placeholder="0.00"
                                />
                              </div>
                            ) : (
                              <button
                                className={`w-full h-full px-4 py-2.5 text-xs group transition-colors ${
                                  hasPrice
                                    ? 'text-gray-900 hover:bg-gray-50 font-medium'
                                    : 'text-gray-300 hover:bg-gray-50 hover:text-gray-600'
                                }`}
                                onClick={() => {
                                  setEditingCell({ itemTypeId: item.id, serviceId: svc.id })
                                  setCellPrice(cell?.isActive ? cell.price.toString() : '')
                                }}
                                title={hasPrice ? 'Click to edit' : 'Click to set price'}
                              >
                                {hasPrice ? (
                                  <span className="flex items-center justify-center gap-1">
                                    GHS {cell!.price.toFixed(2)}
                                    {cell && (
                                      <span
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 ml-1"
                                        onClick={(e) => { e.stopPropagation(); handleDisablePrice(item.id, svc.id) }}
                                        title="Disable"
                                      >
                                        ×
                                      </span>
                                    )}
                                  </span>
                                ) : '+ Set'}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">Click a cell to set or edit a price. Click × to disable a combination.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
