'use client'

import { useEffect, useState, useTransition } from 'react'
import { createItemType } from '@/services/items/createItemType'
import { toggleItemType } from '@/services/items/toggleItemType'
import type { ItemType } from '@/services/items/getItemTypes'
import { createService } from '@/services/services/createService'
import { toggleService } from '@/services/services/toggleService'
import { setServicePricing } from '@/services/services/setServicePricing'
import type { LaundryService } from '@/services/services/getServices'
import { upsertPrice } from '@/services/pricing/upsertPrice'
import { togglePrice } from '@/services/pricing/togglePrice'
import type { PriceCell } from '@/services/pricing/getPricingMatrix'
import type { PricingMode, PricingModel } from '@/constants/statuses'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImportPricingModal } from './ImportPricingModal'

interface Props {
  itemTypes: ItemType[]
  services: LaundryService[]
  prices: PriceCell[]
  pricingModel: PricingModel
}

function ModeToggle({ value, onChange }: { value: PricingMode; onChange: (m: PricingMode) => void }) {
  return (
    <div className="inline-flex rounded-7 border border-warm-300 overflow-hidden text-[11px] shrink-0">
      {(['per_item', 'per_kg'] as const).map(m => (
        <button
          key={m}
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onChange(m)}
          className={`px-2 py-1 font-medium transition-colors ${
            value === m ? 'bg-brand text-[#FAF8F5]' : 'text-warm-500 hover:bg-warm-100'
          }`}
        >
          {m === 'per_item' ? 'item' : 'kg'}
        </button>
      ))}
    </div>
  )
}

export function ItemsServicesClient({ itemTypes: initItems, services: initServices, prices: initPrices, pricingModel }: Props) {
  const [tab, setTab] = useState<'items' | 'services' | 'pricing'>('items')
  const [items, setItems] = useState(initItems)
  const [services, setServices] = useState(initServices)
  const [prices, setPrices] = useState(initPrices)
  // Re-sync local state when the server re-fetches (e.g. after router.refresh()
  // post-import) — this component stays mounted across a refresh, so its
  // useState initial values alone won't pick up the new props.
  useEffect(() => { setItems(initItems) }, [initItems])
  useEffect(() => { setServices(initServices) }, [initServices])
  useEffect(() => { setPrices(initPrices) }, [initPrices])
  const [isPending, startTransition] = useTransition()
  const [newItemName, setNewItemName] = useState('')
  const [newServiceName, setNewServiceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<{ itemTypeId: string; serviceId: string } | null>(null)
  const [cellPrice, setCellPrice] = useState('')
  const [editingRateServiceId, setEditingRateServiceId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  // Mobile: expanded item card in pricing view
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  // Exceptions editor (mixed mode, per_kg services only)
  const [addingExceptionFor, setAddingExceptionFor] = useState<string | null>(null)
  const [newExceptionItemTypeId, setNewExceptionItemTypeId] = useState('')
  const [newExceptionPrice, setNewExceptionPrice] = useState('')

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

  function handleServiceModeChange(svc: LaundryService, newMode: PricingMode) {
    const newKgRate = newMode === 'per_kg' ? svc.kgRate : null
    setError(null)
    startTransition(async () => {
      const res = await setServicePricing(svc.id, newMode, newKgRate)
      if (res.success) {
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, pricingMode: newMode, kgRate: newKgRate } : s))
      } else {
        setError(res.error)
      }
    })
  }

  function startEditingRate(svc: LaundryService) {
    setEditingRateServiceId(svc.id)
    setRateInput(svc.kgRate !== null ? svc.kgRate.toString() : '')
  }

  function saveRate(serviceId: string) {
    const val = parseFloat(rateInput)
    if (isNaN(val) || val < 0) { setEditingRateServiceId(null); return }
    setError(null)
    startTransition(async () => {
      const res = await setServicePricing(serviceId, 'per_kg', val)
      if (res.success) {
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, kgRate: val } : s))
      } else {
        setError(res.error)
      }
      setEditingRateServiceId(null)
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
          if (existing) return prev.map(p =>
            p.itemTypeId === itemTypeId && p.serviceId === serviceId
              ? { ...p, price: val, isActive: true } : p
          )
          return [...prev, { id: '', itemTypeId, serviceId, price: val, isActive: true }]
        })
      }
      setEditingCell(null)
    })
  }

  function startEditingCell(itemTypeId: string, serviceId: string, cell?: PriceCell) {
    setEditingCell({ itemTypeId, serviceId })
    setCellPrice(cell ? cell.price.toString() : '')
  }

  function handleDisablePrice(itemTypeId: string, serviceId: string) {
    const cell = getPrice(itemTypeId, serviceId)
    if (!cell) return
    startTransition(async () => {
      const res = await togglePrice(cell.id, false)
      if (res.success) setPrices(prev =>
        prev.map(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId ? { ...p, isActive: false } : p)
      )
    })
  }

  function openAddException(serviceId: string) {
    setAddingExceptionFor(serviceId)
    setNewExceptionItemTypeId('')
    setNewExceptionPrice('')
  }

  function saveException(serviceId: string) {
    const itemTypeId = newExceptionItemTypeId
    const val = parseFloat(newExceptionPrice)
    if (!itemTypeId || isNaN(val) || val < 0) return
    startTransition(async () => {
      const res = await upsertPrice(itemTypeId, serviceId, val)
      if (res.success) {
        setPrices(prev => {
          const existing = prev.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId)
          if (existing) return prev.map(p =>
            p.itemTypeId === itemTypeId && p.serviceId === serviceId
              ? { ...p, price: val, isActive: true } : p
          )
          return [...prev, { id: '', itemTypeId, serviceId, price: val, isActive: true }]
        })
      }
      setAddingExceptionFor(null)
    })
  }

  const activeItems = items.filter(i => i.isActive)
  const activeServices = services.filter(s => s.isActive)
  const perKgServices = activeServices.filter(s => s.pricingMode === 'per_kg')
  const perItemServices = activeServices.filter(s => s.pricingMode === 'per_item')
  const currentServiceId = perItemServices.some(s => s.id === selectedServiceId)
    ? selectedServiceId
    : perItemServices[0]?.id ?? ''

  const TAB_LABELS = { items: 'Item Types', services: 'Services', pricing: 'Pricing' }

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-6">
      {/* Tab bar */}
      <div className="flex border-b border-warm-200 mb-6">
        {(['items', 'services', 'pricing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-ui font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-brand text-warm-950'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#FDF1EF] border border-[#E0BBB6] rounded-7 px-3 py-2 text-ui text-error-fg mb-4">
          {error}
        </div>
      )}

      {/* Item Types tab */}
      {tab === 'items' && (
        <div className="space-y-4 max-w-lg">
          <div className="flex gap-2">
            <Input
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="e.g. Shirt, Trouser, Suit…"
            />
            <Button onClick={addItem} disabled={isPending || !newItemName.trim()}>Add</Button>
          </div>
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            {items.length === 0 && (
              <EmptyState headline="No item types yet" body="Add items like Shirt, Trouser, Suit to get started." />
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 border-b border-warm-100 last:border-0">
                <span className={`text-ui ${item.isActive ? 'text-warm-950' : 'text-warm-400 line-through'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => handleToggleItem(item.id, item.isActive)}
                  disabled={isPending}
                  className="text-caption text-warm-400 hover:text-warm-700 transition-colors"
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services tab */}
      {tab === 'services' && (
        <div className="space-y-4 max-w-lg">
          <div className="flex gap-2">
            <Input
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addService()}
              placeholder="e.g. Wash Only, Wash + Iron, Dry Clean…"
            />
            <Button onClick={addService} disabled={isPending || !newServiceName.trim()}>Add</Button>
          </div>
          {pricingModel === 'mixed' && (
            <p className="text-caption text-warm-500">
              Use the toggle to choose whether each service is priced per item or by weight.
            </p>
          )}
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            {services.length === 0 && (
              <EmptyState headline="No services yet" body="Add services like Wash Only, Dry Clean to get started." />
            )}
            {services.map(svc => (
              <div key={svc.id} className="flex items-center justify-between px-5 py-3 border-b border-warm-100 last:border-0">
                <span className={`text-ui ${svc.isActive ? 'text-warm-950' : 'text-warm-400 line-through'}`}>
                  {svc.name}
                </span>
                <div className="flex items-center gap-3">
                  {pricingModel === 'mixed' && svc.isActive && (
                    <ModeToggle value={svc.pricingMode} onChange={m => handleServiceModeChange(svc, m)} />
                  )}
                  <button
                    onClick={() => handleToggleService(svc.id, svc.isActive)}
                    disabled={isPending}
                    className="text-caption text-warm-400 hover:text-warm-700 transition-colors"
                  >
                    {svc.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing tab */}
      {tab === 'pricing' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              Import Pricing
            </Button>
          </div>
          {activeServices.length === 0 ? (
            <EmptyState
              headline="Nothing to price yet"
              body="Add active services first to build the pricing matrix."
            />
          ) : (
            <>
              {/* Weight-based services — one rate per service, no per-item breakdown */}
              {pricingModel !== 'per_item' && perKgServices.length > 0 && (
                <section>
                  <p className="text-label font-medium text-warm-700 mb-3">Weight-based pricing</p>
                  <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                    {perKgServices.map(svc => {
                      const isEditing = editingRateServiceId === svc.id
                      const exceptions = activeItems
                        .map(item => ({ item, cell: getPrice(item.id, svc.id) }))
                        .filter((e): e is { item: typeof e.item; cell: NonNullable<typeof e.cell> } => !!e.cell?.isActive)
                      const availableForException = activeItems.filter(
                        item => !exceptions.some(e => e.item.id === item.id)
                      )
                      const isAddingThis = addingExceptionFor === svc.id

                      return (
                        <div key={svc.id} className="border-b border-warm-100 last:border-0">
                          <div className="flex items-center justify-between px-5 py-3.5">
                            <div>
                              <p className="text-ui text-warm-950">{svc.name}</p>
                              <p className="text-caption text-warm-500">Charged by total weight, not per item</p>
                            </div>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-caption text-warm-500">GHS</span>
                                <input
                                  autoFocus
                                  value={rateInput}
                                  onChange={e => setRateInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveRate(svc.id)
                                    if (e.key === 'Escape') setEditingRateServiceId(null)
                                  }}
                                  onBlur={() => saveRate(svc.id)}
                                  className="w-24 border border-brand rounded-7 px-2.5 py-1.5 text-ui text-warm-950 text-right focus:outline-none focus:shadow-focus-ring"
                                  placeholder="0.00"
                                />
                                <span className="text-caption text-warm-500">/ kg</span>
                              </div>
                            ) : svc.kgRate !== null ? (
                              <div className="flex items-center gap-3">
                                <span className="tnum text-ui font-medium text-warm-950">
                                  GHS {svc.kgRate.toFixed(2)} <span className="text-caption text-warm-400 font-normal">/ kg</span>
                                </span>
                                <button
                                  onClick={() => startEditingRate(svc)}
                                  disabled={isPending}
                                  className="text-caption text-warm-400 hover:text-warm-700"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingRate(svc)}
                                disabled={isPending}
                                className="text-ui text-warm-300 hover:text-warm-600 transition-colors"
                              >
                                — Set rate
                              </button>
                            )}
                          </div>

                          {/* Exceptions — item types priced per-item instead of by weight for this service */}
                          {pricingModel === 'mixed' && (
                            <div className="px-5 pb-3.5 -mt-1 pt-2.5 border-t border-warm-100">
                              <p className="text-caption text-warm-500 mb-2">Priced per item instead of by weight</p>
                              {exceptions.length === 0 && !isAddingThis && (
                                <p className="text-caption text-warm-400 mb-2">No exceptions — everything on this service is priced by weight.</p>
                              )}
                              <div className="space-y-1.5">
                                {exceptions.map(({ item, cell }) => {
                                  const isEditingCell = editingCell?.itemTypeId === item.id && editingCell?.serviceId === svc.id
                                  return (
                                    <div key={item.id} className="flex items-center justify-between">
                                      <span className="text-ui text-warm-800">{item.name}</span>
                                      <div className="flex items-center gap-2">
                                        {isEditingCell ? (
                                          <input
                                            autoFocus
                                            value={cellPrice}
                                            onChange={e => setCellPrice(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') savePrice(item.id, svc.id)
                                              if (e.key === 'Escape') setEditingCell(null)
                                            }}
                                            onBlur={() => savePrice(item.id, svc.id)}
                                            className="w-20 border border-brand rounded-7 px-2 py-1 text-ui text-warm-950 text-right focus:outline-none focus:shadow-focus-ring"
                                          />
                                        ) : (
                                          <button
                                            onClick={() => startEditingCell(item.id, svc.id, cell)}
                                            disabled={isPending}
                                            className="tnum text-ui font-medium text-warm-950 hover:text-brand"
                                          >
                                            GHS {cell.price.toFixed(2)}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDisablePrice(item.id, svc.id)}
                                          disabled={isPending}
                                          className="text-caption text-warm-400 hover:text-error-fg"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              {isAddingThis ? (
                                <div className="flex items-center gap-2 mt-2">
                                  <select
                                    value={newExceptionItemTypeId}
                                    onChange={e => setNewExceptionItemTypeId(e.target.value)}
                                    autoFocus
                                    className="flex-1 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-warm-950 bg-white focus:outline-none focus:border-brand"
                                  >
                                    <option value="">Select item…</option>
                                    {availableForException.map(item => (
                                      <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    value={newExceptionPrice}
                                    onChange={e => setNewExceptionPrice(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveException(svc.id)}
                                    placeholder="0.00"
                                    className="w-20 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-warm-950 text-right focus:outline-none focus:border-brand"
                                  />
                                  <button
                                    onClick={() => saveException(svc.id)}
                                    disabled={!newExceptionItemTypeId || !newExceptionPrice || isPending}
                                    className="text-caption text-brand font-medium disabled:opacity-40"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => setAddingExceptionFor(null)}
                                    className="text-caption text-warm-400 hover:text-warm-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                availableForException.length > 0 && (
                                  <button
                                    onClick={() => openAddException(svc.id)}
                                    className="mt-2 text-caption text-brand hover:text-brand-hover underline underline-offset-2"
                                  >
                                    + Add exception
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Per-item services — item type × service price matrix */}
              {pricingModel !== 'per_kg' && perItemServices.length > 0 && (
                <section>
                  <p className="text-label font-medium text-warm-700 mb-3">Item pricing</p>
                  {activeItems.length === 0 ? (
                    <EmptyState
                      headline="No item types yet"
                      body="Add active item types to price them per service."
                    />
                  ) : (
                    <div>
                      {/* Service selector tabs */}
                      <div className="flex gap-1 mb-5 border-b border-warm-200 overflow-x-auto">
                        {perItemServices.map(svc => (
                          <button
                            key={svc.id}
                            onClick={() => { setSelectedServiceId(svc.id); setEditingCell(null) }}
                            className={`px-4 py-2.5 text-ui font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                              currentServiceId === svc.id
                                ? 'border-brand text-warm-950'
                                : 'border-transparent text-warm-500 hover:text-warm-800'
                            }`}
                          >
                            {svc.name}
                          </button>
                        ))}
                      </div>

                      {/* Desktop: list view */}
                      <div className="hidden md:block bg-white border border-warm-300 rounded-10 overflow-hidden">
                        <div className="grid px-5 py-2.5 bg-[#F4F0EA] border-b border-warm-200" style={{ gridTemplateColumns: '1fr 180px' }}>
                          <span className="text-caption font-medium text-warm-500">Item type</span>
                          <span className="text-caption font-medium text-warm-500 text-right">Price (GHS)</span>
                        </div>
                        {activeItems.map(item => {
                          const cell = getPrice(item.id, currentServiceId)
                          const isEditing = editingCell?.itemTypeId === item.id && editingCell?.serviceId === currentServiceId
                          const hasPrice = cell?.isActive

                          return (
                            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 border-b border-warm-100 last:border-0">
                              <span className="text-ui text-warm-950">{item.name}</span>
                              <div className="flex items-center gap-3">
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    value={cellPrice}
                                    onChange={e => setCellPrice(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') savePrice(item.id, currentServiceId)
                                      if (e.key === 'Escape') setEditingCell(null)
                                    }}
                                    onBlur={() => savePrice(item.id, currentServiceId)}
                                    className="w-24 border border-brand rounded-7 px-2.5 py-1.5 text-ui text-warm-950 text-right focus:outline-none focus:shadow-focus-ring"
                                    placeholder="0.00"
                                  />
                                ) : hasPrice ? (
                                  <>
                                    <span className="tnum text-ui font-medium text-warm-950">
                                      {cell!.price.toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => startEditingCell(item.id, currentServiceId, cell)}
                                      disabled={isPending}
                                      className="text-caption text-warm-400 hover:text-warm-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDisablePrice(item.id, currentServiceId)}
                                      disabled={isPending}
                                      className="text-caption text-warm-400 hover:text-error-fg"
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => startEditingCell(item.id, currentServiceId)}
                                    disabled={isPending}
                                    className="text-ui text-warm-300 hover:text-warm-600 transition-colors"
                                  >
                                    — Set price
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Mobile: expandable item cards */}
                      <div className="md:hidden space-y-2">
                        {activeItems.map(item => {
                          const isOpen = expandedItemId === item.id
                          const previewCell = getPrice(item.id, currentServiceId)

                          return (
                            <div key={item.id} className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                              <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3"
                                onClick={() => setExpandedItemId(isOpen ? null : item.id)}
                              >
                                <span className="text-ui font-medium text-warm-950">{item.name}</span>
                                <div className="flex items-center gap-2">
                                  {previewCell?.isActive && (
                                    <span className="tnum text-ui text-warm-500">GHS {previewCell.price.toFixed(2)}</span>
                                  )}
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-warm-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </button>

                              {isOpen && (
                                <div className="border-t border-warm-100 divide-y divide-warm-100">
                                  {perItemServices.map(svc => {
                                    const cell = getPrice(item.id, svc.id)
                                    const isEditingThis = editingCell?.itemTypeId === item.id && editingCell?.serviceId === svc.id

                                    return (
                                      <div key={svc.id} className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-ui text-warm-700">{svc.name}</span>
                                        {isEditingThis ? (
                                          <input
                                            autoFocus
                                            value={cellPrice}
                                            onChange={e => setCellPrice(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') savePrice(item.id, svc.id)
                                              if (e.key === 'Escape') setEditingCell(null)
                                            }}
                                            onBlur={() => savePrice(item.id, svc.id)}
                                            className="w-20 border border-brand rounded-7 px-2.5 py-1.5 text-ui text-right focus:outline-none focus:shadow-focus-ring"
                                            placeholder="0.00"
                                          />
                                        ) : cell?.isActive ? (
                                          <button
                                            onClick={() => startEditingCell(item.id, svc.id, cell)}
                                            className="tnum text-ui font-medium text-brand underline underline-offset-2"
                                          >
                                            GHS {cell.price.toFixed(2)}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => startEditingCell(item.id, svc.id)}
                                            className="text-caption text-warm-400 hover:text-brand"
                                          >
                                            + Set price
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <p className="text-caption text-warm-400 mt-3">
                        Leave items blank if you don&apos;t offer that combination. Only priced items appear in order creation.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}

      <ImportPricingModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  )
}
