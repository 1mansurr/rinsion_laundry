'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCustomerOrder } from '@/services/orders/submitCustomerOrder'
import type { ItemType } from '@/services/items/getItemTypes'
import type { LaundryService } from '@/services/services/getServices'
import type { PriceCell } from '@/services/pricing/getPricingMatrix'
import type { PricingMode } from '@/constants/statuses'
import { formatCurrency } from '@/utils/formatCurrency'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface LineItem {
  itemTypeId: string
  serviceId: string
  quantity: number
  unitPrice: number | null
  totalPrice: number
  pricingMode: PricingMode
}

interface Props {
  laundryId: string
  itemTypes: ItemType[]
  services: LaundryService[]
  prices: PriceCell[]
}

const EMPTY_LINE: LineItem = {
  itemTypeId: '', serviceId: '', quantity: 1, unitPrice: null, totalPrice: 0, pricingMode: 'per_item',
}

/**
 * Bare-bones version of (app)/orders/new/CreateOrderForm.tsx for the
 * customer portal: no customer picker (the session already is the
 * customer), no priority/pickup-date/pay-in-advance, and — critically — no
 * manual unit-price entry. A customer can't pick a price within a range the
 * way staff can, so every line always uses the range ceiling
 * (max_price/max_kg_rate) as the estimate, per the "final price confirmed by
 * the laundry" rule. submitCustomerOrder.ts re-validates server-side.
 */
export function NewCustomerOrderForm({ laundryId, itemTypes, services, prices }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  const usableServices = services.filter(s => s.isActive && (
    s.pricingMode === 'per_kg'
      ? s.minKgRate !== null
      : itemTypes.some(t => t.isActive && prices.some(p => p.itemTypeId === t.id && p.serviceId === s.id && p.isActive))
  ))

  function getService(serviceId: string) {
    return services.find(s => s.id === serviceId)
  }

  function getAvailableItemTypes(serviceId: string) {
    if (!serviceId) return []
    return itemTypes.filter(t =>
      t.isActive && prices.some(p => p.itemTypeId === t.id && p.serviceId === serviceId && p.isActive)
    )
  }

  /** Always the ceiling — see file header. Null if unpriced/not yet selected. */
  function getCeilingPrice(itemTypeId: string, serviceId: string, mode: PricingMode): number | null {
    if (mode === 'per_kg') {
      const svc = getService(serviceId)
      return svc?.maxKgRate ?? null
    }
    const cell = prices.find(p => p.itemTypeId === itemTypeId && p.serviceId === serviceId && p.isActive)
    return cell?.maxPrice ?? null
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, ...patch }
      const identityChanged = patch.serviceId !== undefined || patch.itemTypeId !== undefined
      if (patch.serviceId !== undefined) {
        const svc = getService(updated.serviceId)
        updated.pricingMode = svc?.pricingMode ?? 'per_item'
        if (updated.pricingMode === 'per_kg') {
          updated.itemTypeId = ''
        } else {
          const avail = getAvailableItemTypes(updated.serviceId)
          if (!avail.some(t => t.id === updated.itemTypeId)) {
            updated.itemTypeId = avail.length === 1 ? avail[0].id : ''
          }
        }
      }
      if (identityChanged) {
        updated.unitPrice = getCeilingPrice(updated.itemTypeId, updated.serviceId, updated.pricingMode)
      }
      updated.totalPrice = updated.unitPrice !== null ? updated.unitPrice * updated.quantity : 0
      return updated
    }))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)) }

  const total = lines.reduce((s, l) => s + l.totalPrice, 0)
  const validLines = lines.filter(l =>
    l.serviceId && (l.pricingMode === 'per_kg' || l.itemTypeId) && l.quantity > 0 && l.unitPrice !== null
  )
  const canSubmit = validLines.length > 0

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const res = await submitCustomerOrder({
        laundryId,
        notes: notes || undefined,
        items: validLines.map(l => ({
          itemTypeId: l.itemTypeId || undefined,
          serviceId: l.serviceId,
          quantity: l.quantity,
          unitPrice: l.unitPrice!,
          totalPrice: l.totalPrice,
          pricingMode: l.pricingMode,
        })),
      })
      if (!res.success) { setError(res.error); return }
      router.push(`/portal/orders/${res.data.orderId}/invoice`)
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-12 px-4 py-3 text-ui text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {lines.map((line, i) => {
          const availableItemTypes = getAvailableItemTypes(line.serviceId)
          return (
            <div key={i} className="bg-white border border-warm-300 rounded-18 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-caption text-warm-500 mb-1">Service</p>
                  <SearchableSelect
                    value={line.serviceId}
                    onChange={v => updateLine(i, { serviceId: v })}
                    options={usableServices.map(s => ({ value: s.id, label: s.name }))}
                    placeholder="Select…"
                  />
                </div>
                <div>
                  <p className="text-caption text-warm-500 mb-1">Item type</p>
                  {line.pricingMode === 'per_kg' ? (
                    <p className="text-[14px] text-warm-400 italic py-2">Priced by weight</p>
                  ) : (
                    <SearchableSelect
                      value={line.itemTypeId}
                      onChange={v => updateLine(i, { itemTypeId: v })}
                      options={availableItemTypes.map(t => ({ value: t.id, label: t.name }))}
                      disabled={!line.serviceId}
                      placeholder="Select…"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {line.pricingMode === 'per_kg' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0.1"
                      value={line.quantity}
                      onChange={e => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-16 border border-warm-300 rounded-12 px-2 py-1.5 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                    />
                    <span className="text-caption text-warm-500">kg</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center border border-warm-300 rounded-12 overflow-hidden">
                    <button type="button" onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })} className="w-11 h-11 flex items-center justify-center text-brand text-lg leading-none">−</button>
                    <span className="tnum w-9 text-center text-ui font-bold text-warm-950">{line.quantity}</span>
                    <button type="button" onClick={() => updateLine(i, { quantity: line.quantity + 1 })} className="w-11 h-11 flex items-center justify-center text-brand text-lg leading-none">+</button>
                  </div>
                )}
                <span className="tnum text-ui font-semibold text-warm-950">
                  {line.totalPrice > 0 ? formatCurrency(line.totalPrice) : '—'}
                </span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="text-caption text-warm-400 hover:text-red-600">Remove</button>
                )}
              </div>
              {line.unitPrice !== null && (
                <p className="text-caption text-warm-500">
                  Estimated at {formatCurrency(line.unitPrice)} — final price confirmed by the laundry
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="mt-3 w-full py-2.5 border border-dashed border-warm-400 rounded-12 text-label font-medium text-warm-600 hover:border-brand hover:text-brand transition-colors"
      >
        + Add another item
      </button>

      <div className="mt-4">
        <Textarea
          label="Notes (optional)"
          placeholder="Special instructions…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="mt-6 bg-white border border-warm-300 rounded-18 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-caption text-warm-600">{validLines.length} item{validLines.length !== 1 ? 's' : ''}</p>
          <p className="tnum text-[20px] font-semibold text-warm-950">{formatCurrency(total)}</p>
        </div>
        <Button variant="primary" isPending={isPending} disabled={!canSubmit || isPending} onClick={handleSubmit}>
          Create order
        </Button>
      </div>
    </div>
  )
}
