'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateLaundrySetup } from './actions'
import { createService, setServicePricing } from '@/services/services'
import { createItemType } from '@/services/items'
import { upsertPrice } from '@/services/pricing'
import { updateSettings } from '@/services/settings'
import { PRICING_MODELS, type PricingModel } from '@/constants/statuses'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Wordmark } from '@/components/ui/Wordmark'

const PRICING_MODEL_LABELS: Record<PricingModel, { label: string; description: string }> = {
  per_item: { label: 'Per item', description: 'Every service is priced per piece (e.g. GHS 5 per shirt).' },
  per_kg: { label: 'Per weight', description: 'Every service is priced by weight (e.g. GHS 15 per kg).' },
  mixed: { label: 'Mixed', description: "Choose per item or per weight for each service individually, e.g. Wash Only by weight, Ironing per item." },
}

interface Props {
  laundryId: string
  defaultLaundryName: string
  defaultBranchId: string
  defaultBranchName: string
}

const DEFAULT_SERVICES = ['Wash Only', 'Wash + Iron', 'Dry Clean']
const DEFAULT_ITEMS = ['Shirt', 'Trouser', 'Suit', 'Dress', 'Bed Sheet']

function smsCharColor(len: number) {
  if (len > 160) return 'text-error-fg'
  if (len > 140) return 'text-[#C25A3C]'
  return 'text-warm-500'
}

function buildSmsPreview(laundryName: string, branchName: string) {
  const name = laundryName.trim() || '[Laundry Name]'
  const branch = branchName.trim() || '[Branch]'
  return `Hi [Customer]! Your laundry from ${name} (${branch}) is ready for pickup. Your code is 12345. Reply STOP to opt out.`
}

export function OnboardingClient({ laundryId, defaultLaundryName, defaultBranchId, defaultBranchName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Step 1 fields
  const [laundryName, setLaundryName] = useState(defaultLaundryName)
  const [branchName, setBranchName] = useState(defaultBranchName)

  // Step 2 — pricing model
  const [pricingModel, setPricingModel] = useState<PricingModel>('per_item')

  // Step 3 — services (toggle)
  const [selectedServices, setSelectedServices] = useState<string[]>(['Wash Only', 'Wash + Iron'])

  // Step 4 — mini pricing grid (or a flat rate list when pricingModel is per_kg)
  // Created service IDs after step 3 submission
  const [createdServiceIds, setCreatedServiceIds] = useState<{ name: string; id: string }[]>([])
  const [createdItemIds, setCreatedItemIds] = useState<{ name: string; id: string }[]>([])
  const [pricingGrid, setPricingGrid] = useState<Record<string, Record<string, string>>>({})
  const [kgRates, setKgRates] = useState<Record<string, string>>({})

  const smsPreview = buildSmsPreview(laundryName, branchName)
  const smsLen = smsPreview.length

  async function saveStep1() {
    if (!laundryName.trim()) { setError('Laundry name is required.'); return }
    setError('')
    startTransition(async () => {
      const res = await updateLaundrySetup(laundryId, laundryName, defaultBranchId, branchName)
      if (!res.success) { setError(res.error); return }
      setStep(2)
    })
  }

  async function savePricingModel() {
    setError('')
    startTransition(async () => {
      const res = await updateSettings({ pricingModel })
      if (!res.success) { setError(res.error); return }
      setStep(3)
    })
  }

  async function saveServices() {
    if (selectedServices.length === 0) {
      // Skip is allowed for steps > 1
      setStep(4)
      return
    }
    setError('')
    startTransition(async () => {
      // Create default items and selected services — new services default to
      // this laundry's pricing model (set in the previous step)
      const [serviceResults, itemResults] = await Promise.all([
        Promise.all(selectedServices.map(name => createService(name))),
        Promise.all(DEFAULT_ITEMS.map(name => createItemType(name))),
      ])

      const svcIds = serviceResults
        .filter(r => r.success)
        .map((r, i) => ({ name: selectedServices[i], id: (r as { success: true; data: { id: string } }).data.id }))

      const itemIds = itemResults
        .filter(r => r.success)
        .map((r, i) => ({ name: DEFAULT_ITEMS[i], id: (r as { success: true; data: { id: string } }).data.id }))

      setCreatedServiceIds(svcIds)
      setCreatedItemIds(itemIds)
      setStep(4)
    })
  }

  async function savePricing() {
    setError('')
    startTransition(async () => {
      const entries: Promise<unknown>[] = []
      if (pricingModel === 'per_kg') {
        // Every created service is priced by weight — a single rate each, no item breakdown
        for (const svc of createdServiceIds) {
          const val = kgRates[svc.id]
          if (val && parseFloat(val) > 0) {
            entries.push(setServicePricing(svc.id, 'per_kg', parseFloat(val)))
          }
        }
      } else {
        for (const item of createdItemIds) {
          for (const svc of createdServiceIds) {
            const val = pricingGrid[item.id]?.[svc.id]
            if (val && parseFloat(val) > 0) {
              entries.push(upsertPrice(item.id, svc.id, parseFloat(val)))
            }
          }
        }
      }
      await Promise.all(entries)
      router.push('/dashboard')
    })
  }

  function toggleService(name: string) {
    setSelectedServices(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  function setPriceCell(itemId: string, svcId: string, val: string) {
    setPricingGrid(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [svcId]: val },
    }))
  }

  function setKgRate(svcId: string, val: string) {
    setKgRates(prev => ({ ...prev, [svcId]: val }))
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center py-6 border-b border-warm-200">
        <Wordmark size="md" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[680px]">
          {/* Progress stepper */}
          <div className="flex items-center mb-10">
            {[1, 2, 3, 4].map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                {i > 0 && (
                  <div className={`flex-1 h-px mx-2 ${s <= step ? 'bg-brand' : 'bg-warm-200'}`} />
                )}
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  s < step ? 'bg-brand border-brand' :
                  s === step ? 'border-brand bg-white' :
                  'border-warm-300 bg-white'
                }`}>
                  {s < step ? (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3 3 7-7" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className={`text-[11px] font-semibold ${s === step ? 'text-brand' : 'text-warm-400'}`}>
                      {s}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1 — Laundry details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">Set up your laundry</h1>
                <p className="text-body text-warm-600">Confirm your laundry name and branch to get started.</p>
              </div>

              {error && <p className="text-caption text-error-fg">{error}</p>}

              <div className="space-y-4">
                <Input
                  label="Laundry name"
                  value={laundryName}
                  onChange={e => setLaundryName(e.target.value)}
                  placeholder="e.g. Bright Clean Laundry"
                />
                <Input
                  label="Branch name"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="e.g. KNUST Branch"
                />
              </div>

              {/* SMS preview */}
              <div className="bg-white border border-warm-300 rounded-10 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-label font-medium text-warm-700">SMS preview</p>
                  <span className={`tnum text-caption font-medium ${smsCharColor(smsLen)}`}>
                    {smsLen}/160 · {smsLen <= 160 ? '1 SMS' : '2 SMS'}
                  </span>
                </div>
                <p className="text-body text-warm-800 bg-[#F4F0EA] rounded-7 px-4 py-3 leading-relaxed">
                  {smsPreview}
                </p>
                <p className="text-caption text-warm-400 mt-2">
                  Sent to customers when their order is ready for collection.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveStep1} isPending={isPending} size="lg">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Pricing model */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">How do you charge?</h1>
                <p className="text-body text-warm-600">
                  This decides how the pricing matrix works. You can change it later in Settings.
                </p>
              </div>

              {error && <p className="text-caption text-error-fg">{error}</p>}

              <div className="space-y-3">
                {PRICING_MODELS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPricingModel(m)}
                    className={`w-full text-left px-4 py-3 rounded-10 border transition-colors ${
                      pricingModel === m ? 'border-brand bg-brand-pale' : 'border-warm-300 hover:bg-warm-50'
                    }`}
                  >
                    <p className="text-ui font-medium text-warm-950">{PRICING_MODEL_LABELS[m].label}</p>
                    <p className="text-caption text-warm-600 mt-0.5">{PRICING_MODEL_LABELS[m].description}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
                <Button onClick={savePricingModel} isPending={isPending} size="lg">Next</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Services */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">Choose your services</h1>
                <p className="text-body text-warm-600">Select the services you offer. You can add more later.</p>
              </div>

              <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                {DEFAULT_SERVICES.map(svc => {
                  const checked = selectedServices.includes(svc)
                  return (
                    <label
                      key={svc}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-warm-100 last:border-0 cursor-pointer hover:bg-warm-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(svc)}
                        className="w-4 h-4 rounded border-warm-300 accent-brand"
                      />
                      <span className="text-ui text-warm-950">{svc}</span>
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={isPending}>Back</Button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-caption text-warm-500 hover:text-warm-800 underline underline-offset-2"
                  >
                    I&apos;ll do this later
                  </button>
                  <Button onClick={saveServices} isPending={isPending} size="lg">Next</Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Mini pricing grid */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">Set your prices</h1>
                <p className="text-body text-warm-600">
                  Add prices for each item × service combination. You can skip and set these later.
                </p>
              </div>

              {createdServiceIds.length === 0 ? (
                <div className="bg-white border border-warm-300 rounded-10 p-5 text-center">
                  <p className="text-body text-warm-500">
                    No services were created in step 3. You can set pricing from Settings → Items &amp; Services.
                  </p>
                </div>
              ) : pricingModel === 'per_kg' ? (
                <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                  {createdServiceIds.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between px-5 py-3.5 border-b border-warm-100 last:border-0">
                      <span className="text-ui text-warm-950">{svc.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-caption text-warm-500">GHS</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={kgRates[svc.id] ?? ''}
                          onChange={e => setKgRate(svc.id, e.target.value)}
                          placeholder="—"
                          className="w-20 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                        />
                        <span className="text-caption text-warm-500">/ kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : createdItemIds.length > 0 ? (
                <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                  {/* Header */}
                  <div
                    className="grid bg-[#F4F0EA] px-5 py-2.5 border-b border-warm-200"
                    style={{ gridTemplateColumns: `1fr ${createdServiceIds.map(() => '120px').join(' ')}` }}
                  >
                    <span className="text-caption font-medium text-warm-500">Item</span>
                    {createdServiceIds.map(svc => (
                      <span key={svc.id} className="text-caption font-medium text-warm-500 text-right">{svc.name}</span>
                    ))}
                  </div>
                  {createdItemIds.map(item => (
                    <div
                      key={item.id}
                      className="grid px-5 py-3 border-b border-warm-100 last:border-0 items-center"
                      style={{ gridTemplateColumns: `1fr ${createdServiceIds.map(() => '120px').join(' ')}` }}
                    >
                      <span className="text-ui text-warm-950">{item.name}</span>
                      {createdServiceIds.map(svc => (
                        <div key={svc.id} className="flex items-center gap-1 justify-end">
                          <span className="text-caption text-warm-500">GHS</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingGrid[item.id]?.[svc.id] ?? ''}
                            onChange={e => setPriceCell(item.id, svc.id, e.target.value)}
                            placeholder="—"
                            className="w-20 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-warm-300 rounded-10 p-5 text-center">
                  <p className="text-body text-warm-500">
                    No item types were created in step 3. You can set pricing from Settings → Items &amp; Services.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} disabled={isPending}>Back</Button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="text-caption text-warm-500 hover:text-warm-800 underline underline-offset-2"
                  >
                    I&apos;ll do this later
                  </button>
                  <Button onClick={savePricing} isPending={isPending} size="lg">Finish</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
