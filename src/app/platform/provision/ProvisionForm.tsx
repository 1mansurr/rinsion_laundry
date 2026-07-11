'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { provisionLaundry } from '@/services/platform/provisionLaundry'
import type { Template, TemplateKey, TemplatePriceCell } from '@/services/platform/templates'

interface Props {
  templates: Record<TemplateKey, Template>
}

export function ProvisionForm({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('general_laundry')
  const [prices, setPrices] = useState<TemplatePriceCell[]>(templates.general_laundry.prices)

  function handleTemplateChange(key: TemplateKey) {
    setTemplateKey(key)
    setPrices(templates[key].prices)
  }

  function updatePrice(index: number, patch: Partial<TemplatePriceCell>) {
    setPrices(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p))
  }

  function handleSubmit() {
    if (!name.trim() || !ownerPhone.trim()) {
      setError('Laundry name and owner phone are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await provisionLaundry({ name: name.trim(), ownerPhone: ownerPhone.trim(), templateKey, prices })
      if (!res.success) { setError(res.error); return }
      router.push(`/platform/${res.data.laundryId}`)
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

      <div>
        <label className="block text-label font-medium text-warm-700 mb-1">Template</label>
        <select
          value={templateKey}
          onChange={e => handleTemplateChange(e.target.value as TemplateKey)}
          className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {Object.values(templates).map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-label font-medium text-warm-700 mb-2">Pricing (GHS) — edit to this laundry&apos;s real prices</p>
        <div className="bg-white border border-warm-300 rounded-10 divide-y divide-warm-200 max-h-[420px] overflow-y-auto">
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
