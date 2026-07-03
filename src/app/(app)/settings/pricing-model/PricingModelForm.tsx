'use client'

import { useState, useTransition } from 'react'
import { updateSettings } from '@/services/settings'
import { PRICING_MODELS, type PricingModel } from '@/constants/statuses'

const LABELS: Record<PricingModel, { label: string; description: string }> = {
  per_item: { label: 'Per item', description: 'Every service is priced per piece (e.g. GHS 5 per shirt).' },
  per_kg: { label: 'Per weight', description: 'Every service is priced by weight (e.g. GHS 15 per kg).' },
  mixed: { label: 'Mixed', description: "Choose per item or per weight for each service individually, e.g. Wash Only by weight, Ironing per item." },
}

export function PricingModelForm({ pricingModel: init }: { pricingModel: PricingModel }) {
  const [pricingModel, setPricingModel] = useState(init)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSelect(next: PricingModel) {
    if (next === pricingModel) return
    const prev = pricingModel
    setPricingModel(next)
    setError(null)
    startTransition(async () => {
      const res = await updateSettings({ pricingModel: next })
      if (!res.success) {
        setPricingModel(prev)
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-caption text-error-fg">{error}</p>}
      {PRICING_MODELS.map(m => (
        <button
          key={m}
          type="button"
          onClick={() => handleSelect(m)}
          disabled={isPending}
          className={`w-full text-left px-4 py-3 rounded-10 border transition-colors disabled:opacity-60 ${
            pricingModel === m ? 'border-brand bg-brand-pale' : 'border-warm-300 hover:bg-warm-50'
          }`}
        >
          <p className="text-ui font-medium text-warm-950">{LABELS[m].label}</p>
          <p className="text-caption text-warm-600 mt-0.5">{LABELS[m].description}</p>
        </button>
      ))}
      <p className="text-caption text-warm-400">
        Set actual prices and rates on the Items &amp; Services page.
      </p>
    </div>
  )
}
