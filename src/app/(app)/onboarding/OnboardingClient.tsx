'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateLaundrySetup, completeOnboarding } from './actions'
import { toggleService } from '@/services/services/toggleService'
import { setServicePricing } from '@/services/services/setServicePricing'
import { upsertPrice } from '@/services/pricing/upsertPrice'
import { updateSettings } from '@/services/settings/updateSettings'
import { startTrial } from '@/services/subscriptions/startTrial'
import { PRICING_MODELS, type PricingModel } from '@/constants/statuses'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Wordmark } from '@/components/ui/Wordmark'
import { SignOutButton } from '@/components/ui/SignOutButton'
import { ImportPricingModal } from '../items-and-services/ImportPricingModal'

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
  /** Item types & services already seeded when the laundry was created — the
   * wizard selects from and prices these rather than creating new rows, so
   * it doesn't double up on the default catalog. */
  itemTypes: { id: string; name: string }[]
  services: { id: string; name: string }[]
}

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

export function OnboardingClient({ laundryId, defaultLaundryName, defaultBranchId, defaultBranchName, itemTypes, services }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Step 1 fields
  const [laundryName, setLaundryName] = useState(defaultLaundryName)
  const [branchName, setBranchName] = useState(defaultBranchName)

  // Step 2 — services (toggle). All start selected since laundry creation
  // already seeded them as active; unchecking one deactivates it.
  const [selectedServices, setSelectedServices] = useState<string[]>(services.map(s => s.id))

  // Step 3 — pricing model
  const [pricingModel, setPricingModel] = useState<PricingModel>('per_item')

  // Step 4 — mini pricing grid (or a flat rate list when pricingModel is per_kg),
  // or a bulk file import as an alternative to manual entry.
  // Created service IDs after step 2 submission
  const [createdServiceIds, setCreatedServiceIds] = useState<{ name: string; id: string }[]>([])
  const [createdItemIds, setCreatedItemIds] = useState<{ name: string; id: string }[]>([])
  // Notes entry is deferred from onboarding (kept fast); admins add notes later via Items & Services.
  const [pricingGridMin, setPricingGridMin] = useState<Record<string, Record<string, string>>>({})
  const [pricingGridMax, setPricingGridMax] = useState<Record<string, Record<string, string>>>({})
  const [kgRatesMin, setKgRatesMin] = useState<Record<string, string>>({})
  const [kgRatesMax, setKgRatesMax] = useState<Record<string, string>>({})
  const [priceEntryMode, setPriceEntryMode] = useState<'manual' | 'import'>('manual')
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Trial-start confirmation, shown once onboarding is done
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [startingTrial, startTrialTransition] = useTransition()
  const [trialError, setTrialError] = useState('')

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

  async function saveServices() {
    setError('')
    startTransition(async () => {
      // Item types and services already exist from laundry creation — just
      // deactivate the ones the admin didn't pick. The pricing-model step
      // comes next and cascades onto every service, so it's fine for these
      // to start out with whatever pricing_mode the laundry currently has.
      const deselected = services.filter(s => !selectedServices.includes(s.id))
      await Promise.all(deselected.map(s => toggleService(s.id, false)))

      setCreatedServiceIds(services.filter(s => selectedServices.includes(s.id)))
      setCreatedItemIds(itemTypes)
      setStep(3)
    })
  }

  async function savePricingModel() {
    setError('')
    startTransition(async () => {
      const res = await updateSettings({ pricingModel })
      if (!res.success) { setError(res.error); return }
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
          const minVal = kgRatesMin[svc.id]
          if (minVal && parseFloat(minVal) > 0) {
            const maxRaw = kgRatesMax[svc.id]
            const maxVal = maxRaw && parseFloat(maxRaw) > 0 ? parseFloat(maxRaw) : parseFloat(minVal)
            entries.push(setServicePricing(svc.id, 'per_kg', parseFloat(minVal), maxVal, null))
          }
        }
      } else {
        for (const item of createdItemIds) {
          for (const svc of createdServiceIds) {
            const minVal = pricingGridMin[item.id]?.[svc.id]
            if (minVal && parseFloat(minVal) > 0) {
              const maxRaw = pricingGridMax[item.id]?.[svc.id]
              const maxVal = maxRaw && parseFloat(maxRaw) > 0 ? parseFloat(maxRaw) : parseFloat(minVal)
              entries.push(upsertPrice(item.id, svc.id, parseFloat(minVal), maxVal, null))
            }
          }
        }
      }
      await Promise.all(entries)
      await finishOnboarding()
    })
  }

  async function finishOnboarding() {
    await completeOnboarding()
    setShowTrialModal(true)
  }

  function handleStartTrial() {
    setTrialError('')
    startTrialTransition(async () => {
      const res = await startTrial()
      if (!res.success) { setTrialError(res.error); return }
      router.push('/dashboard')
    })
  }

  function handleSkipTrial() {
    router.push('/dashboard')
  }

  function toggleServiceSelection(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function setPriceCellMin(itemId: string, svcId: string, val: string) {
    setPricingGridMin(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [svcId]: val },
    }))
  }

  function setPriceCellMax(itemId: string, svcId: string, val: string) {
    setPricingGridMax(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [svcId]: val },
    }))
  }

  function setKgRateMin(svcId: string, val: string) {
    setKgRatesMin(prev => ({ ...prev, [svcId]: val }))
  }

  function setKgRateMax(svcId: string, val: string) {
    setKgRatesMax(prev => ({ ...prev, [svcId]: val }))
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="relative flex items-center justify-center py-6 border-b border-warm-200">
        <Wordmark size="md" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <SignOutButton className="text-caption text-warm-500 hover:text-warm-800 underline underline-offset-2" />
        </div>
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

          {/* Step 2 — Services */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">Choose your services</h1>
                <p className="text-body text-warm-600">Select the services you offer. You can add more later.</p>
              </div>

              <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
                {services.map(svc => {
                  const checked = selectedServices.includes(svc.id)
                  return (
                    <label
                      key={svc.id}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-warm-100 last:border-0 cursor-pointer hover:bg-warm-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServiceSelection(svc.id)}
                        className="w-4 h-4 rounded border-warm-300 accent-brand"
                      />
                      <span className="text-ui text-warm-950">{svc.name}</span>
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-caption text-warm-500 hover:text-warm-800 underline underline-offset-2"
                  >
                    I&apos;ll do this later
                  </button>
                  <Button onClick={saveServices} isPending={isPending} size="lg">Next</Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Pricing model */}
          {step === 3 && (
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
                <Button variant="ghost" onClick={() => setStep(2)} disabled={isPending}>Back</Button>
                <Button onClick={savePricingModel} isPending={isPending} size="lg">Next</Button>
              </div>
            </div>
          )}

          {/* Step 4 — Set prices: manual grid or bulk import */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-semibold text-warm-950 mb-1">Set your prices</h1>
                <p className="text-body text-warm-600">
                  Add prices manually, or import them from a spreadsheet. You can skip and set these later.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriceEntryMode('manual')}
                  className={`px-4 py-2 rounded-8 text-ui font-medium border transition-colors ${
                    priceEntryMode === 'manual' ? 'border-brand bg-brand-pale text-brand' : 'border-warm-300 text-warm-600 hover:bg-warm-50'
                  }`}
                >
                  Enter manually
                </button>
                <button
                  type="button"
                  onClick={() => setPriceEntryMode('import')}
                  className={`px-4 py-2 rounded-8 text-ui font-medium border transition-colors ${
                    priceEntryMode === 'import' ? 'border-brand bg-brand-pale text-brand' : 'border-warm-300 text-warm-600 hover:bg-warm-50'
                  }`}
                >
                  Import from file
                </button>
              </div>

              {priceEntryMode === 'import' ? (
                <div className="bg-white border border-warm-300 rounded-10 p-5 text-center space-y-3">
                  <p className="text-body text-warm-600">
                    Upload an Excel or CSV file with your services, item types, and prices — we&apos;ll set them all up in bulk.
                  </p>
                  <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                    Open import
                  </Button>
                </div>
              ) : createdServiceIds.length === 0 ? (
                <div className="bg-white border border-warm-300 rounded-10 p-5 text-center">
                  <p className="text-body text-warm-500">
                    No services were created in the previous step. You can set pricing from Settings → Items &amp; Services.
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
                          value={kgRatesMin[svc.id] ?? ''}
                          onChange={e => setKgRateMin(svc.id, e.target.value)}
                          placeholder="Min"
                          className="w-16 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                        />
                        <span className="text-warm-400">–</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={kgRatesMax[svc.id] ?? ''}
                          onChange={e => setKgRateMax(svc.id, e.target.value)}
                          placeholder="Max"
                          className="w-16 border border-warm-300 rounded-7 px-2 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
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
                    style={{ gridTemplateColumns: `1fr ${createdServiceIds.map(() => '170px').join(' ')}` }}
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
                      style={{ gridTemplateColumns: `1fr ${createdServiceIds.map(() => '170px').join(' ')}` }}
                    >
                      <span className="text-ui text-warm-950">{item.name}</span>
                      {createdServiceIds.map(svc => (
                        <div key={svc.id} className="flex items-center gap-1 justify-end">
                          <span className="text-caption text-warm-500">GHS</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingGridMin[item.id]?.[svc.id] ?? ''}
                            onChange={e => setPriceCellMin(item.id, svc.id, e.target.value)}
                            placeholder="Min"
                            className="w-14 border border-warm-300 rounded-7 px-1.5 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                          />
                          <span className="text-warm-400">–</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingGridMax[item.id]?.[svc.id] ?? ''}
                            onChange={e => setPriceCellMax(item.id, svc.id, e.target.value)}
                            placeholder="Max"
                            className="w-14 border border-warm-300 rounded-7 px-1.5 py-1.5 text-ui text-right tnum text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-warm-300 rounded-10 p-5 text-center">
                  <p className="text-body text-warm-500">
                    No item types were created in the previous step. You can set pricing from Settings → Items &amp; Services.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} disabled={isPending}>Back</Button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startTransition(finishOnboarding)}
                    className="text-caption text-warm-500 hover:text-warm-800 underline underline-offset-2"
                  >
                    I&apos;ll do this later
                  </button>
                  {priceEntryMode === 'manual' && (
                    <Button onClick={savePricing} isPending={isPending} size="lg">Finish</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImportPricingModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => {
          setImportModalOpen(false)
          startTransition(finishOnboarding)
        }}
      />

      <Modal
        open={showTrialModal}
        onClose={handleSkipTrial}
        title="Start your 14-day free trial?"
        description="Full access to orders, payments, and SMS notifications — free for 14 days."
      >
        <div className="space-y-4">
          {trialError && <p className="text-caption text-error-fg">{trialError}</p>}
          <p className="text-body text-warm-600">
            You can start it later from Settings → Subscription if you&apos;re not ready yet.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleSkipTrial} disabled={startingTrial}>
              Not yet
            </Button>
            <Button variant="primary" isPending={startingTrial} disabled={startingTrial} onClick={handleStartTrial}>
              Start free trial
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
