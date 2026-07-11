'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { provisionLaundry } from '@/services/platform/provisionLaundry'
import { ImportProvisionPriceListModal } from './ImportProvisionPriceListModal'
import type { Template, TemplateKey, TemplateService, TemplatePriceCell } from '@/services/platform/templates'
import type { ProvisionImportPreview } from '@/services/platform/parseProvisionPriceList'
import type { PricingModel } from '@/constants/statuses'

interface Props {
  templates: Record<TemplateKey, Template>
}

const PRICING_MODEL_LABEL: Record<PricingModel, string> = {
  per_item: 'Per item',
  per_kg: 'Per weight',
  mixed: 'Mixed',
}

function inferPricingModel(services: TemplateService[]): PricingModel {
  const modes = new Set(services.map(s => s.pricingMode))
  if (modes.size === 0) return 'per_item'
  if (modes.size > 1) return 'mixed'
  return Array.from(modes)[0]
}

export function ProvisionForm({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [source, setSource] = useState<'template' | 'upload'>('template')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('general_laundry')
  const [itemTypes, setItemTypes] = useState<string[]>(templates.general_laundry.itemTypes)
  const [services, setServices] = useState<TemplateService[]>(templates.general_laundry.services)
  const [prices, setPrices] = useState<TemplatePriceCell[]>(templates.general_laundry.prices)
  const [importOpen, setImportOpen] = useState(false)
  const [importSummary, setImportSummary] = useState<{ itemTypes: number; services: number } | null>(null)

  function handleTemplateChange(key: TemplateKey) {
    setSource('template')
    setImportSummary(null)
    setTemplateKey(key)
    setItemTypes(templates[key].itemTypes)
    setServices(templates[key].services)
    setPrices(templates[key].prices)
  }

  function handleImported(preview: ProvisionImportPreview) {
    setSource('upload')
    setImportSummary({ itemTypes: preview.itemTypes.length, services: preview.services.length })
    setItemTypes(preview.itemTypes)
    setServices(preview.services)
    setPrices(preview.prices)
  }

  function updatePrice(index: number, patch: Partial<TemplatePriceCell>) {
    setPrices(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p))
  }

  function handleSubmit() {
    if (!name.trim() || !ownerPhone.trim()) {
      setError('Laundry name and owner phone are required.')
      return
    }
    if (services.length === 0) {
      setError('At least one service is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await provisionLaundry({
        name: name.trim(),
        ownerPhone: ownerPhone.trim(),
        templateKey: source === 'template' ? templateKey : 'custom',
        itemTypes,
        services,
        prices,
        pricingModel: inferPricingModel(services),
      })
      if (!res.success) { setError(res.error); return }
      router.push(`/internal/laundries/${res.data.laundryId}`)
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-7 px-4 py-3 text-ui text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-label font-medium text-warm-700 mb-1">Laundry name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sunrise Laundry"
            className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-label font-medium text-warm-700 mb-1">Owner phone</label>
          <input
            value={ownerPhone}
            onChange={e => setOwnerPhone(e.target.value)}
            placeholder="024 123 4567"
            className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-label font-medium text-warm-700 mb-1">Template</label>
          <select
            value={templateKey}
            onChange={e => handleTemplateChange(e.target.value as TemplateKey)}
            disabled={source === 'upload'}
            className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 bg-white focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.values(templates).map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="border border-warm-300 rounded-7 px-4 py-2 text-ui font-medium text-warm-800 bg-white hover:bg-warm-100 focus:outline-none focus:shadow-focus-ring transition-colors"
        >
          Import price list…
        </button>
      </div>

      {source === 'upload' && importSummary && (
        <div className="flex items-center justify-between bg-brand-pale border border-brand/30 rounded-7 px-4 py-2.5">
          <p className="text-ui text-warm-800">
            Using uploaded list — {importSummary.itemTypes} item type{importSummary.itemTypes === 1 ? '' : 's'}, {importSummary.services} service{importSummary.services === 1 ? '' : 's'}, pricing mode <span className="font-medium">{PRICING_MODEL_LABEL[inferPricingModel(services)]}</span>.
          </p>
          <button
            type="button"
            onClick={() => handleTemplateChange(templateKey)}
            className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 shrink-0 ml-3"
          >
            Use template instead
          </button>
        </div>
      )}

      <ImportProvisionPriceListModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      {services.some(s => s.pricingMode === 'per_kg') && (
        <div>
          <p className="text-label font-medium text-warm-700 mb-2">Weight-based rates (GHS/kg)</p>
          <div className="bg-white border border-warm-300 rounded-10 divide-y divide-warm-200">
            {services.filter(s => s.pricingMode === 'per_kg').map(s => (
              <div key={s.name} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <span className="text-ui text-warm-800 flex-1">{s.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    value={s.kgRate?.min ?? 0}
                    onChange={e => setServices(prev => prev.map(x => x.name === s.name ? { ...x, kgRate: { min: parseFloat(e.target.value) || 0, max: x.kgRate?.max ?? 0 } } : x))}
                    className="w-20 border border-warm-300 rounded-6 px-2 py-1 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                  />
                  <span className="text-warm-400">–</span>
                  <input
                    type="number"
                    step="0.01"
                    value={s.kgRate?.max ?? 0}
                    onChange={e => setServices(prev => prev.map(x => x.name === s.name ? { ...x, kgRate: { min: x.kgRate?.min ?? 0, max: parseFloat(e.target.value) || 0 } } : x))}
                    className="w-20 border border-warm-300 rounded-6 px-2 py-1 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-label font-medium text-warm-700 mb-2">Pricing (GHS) — edit to this laundry&apos;s real prices</p>
        <div className="bg-white border border-warm-300 rounded-10 divide-y divide-warm-200 max-h-[420px] overflow-y-auto">
          {prices.length === 0 && (
            <p className="px-4 py-3 text-caption text-warm-500">No per-item prices — every service is weight-based.</p>
          )}
          {prices.map((p, i) => (
            <div key={`${p.itemType}-${p.service}`} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <span className="text-ui text-warm-800 flex-1">{p.itemType} · {p.service}</span>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  step="0.01"
                  value={p.min}
                  onChange={e => updatePrice(i, { min: parseFloat(e.target.value) || 0 })}
                  className="w-20 border border-warm-300 rounded-6 px-2 py-1 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                />
                <span className="text-warm-400">–</span>
                <input
                  type="number"
                  step="0.01"
                  value={p.max}
                  onChange={e => updatePrice(i, { max: parseFloat(e.target.value) || 0 })}
                  className="w-20 border border-warm-300 rounded-6 px-2 py-1 text-ui text-warm-950 text-right tnum focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="bg-brand text-[#FAF8F5] px-5 py-2.5 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Provisioning…' : 'Provision Laundry'}
      </button>
    </div>
  )
}
