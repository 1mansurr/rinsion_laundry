'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { LaundryForm } from './laundry/LaundryForm'
import { WorkflowToggles } from './workflow/WorkflowToggles'
import { BranchesClient } from './branches/BranchesClient'
import { PricingModelForm } from './pricing-model/PricingModelForm'
import type { LaundrySettings } from '@/services/settings'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

type PanelKey = 'laundry' | 'workflow' | 'branches' | 'pricingModel'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="#C7C0B6"
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 6.4 14.6 12 9 17.6 10.4 19l7-7-7-7L9 6.4Z" />
    </svg>
  )
}

function LaundryPanel({ open }: { open: boolean }) {
  const [data, setData] = useState<{ laundry: { name: string; laundryCode: string } } | null>(null)
  useEffect(() => {
    if (open && !data) fetch('/api/settings/laundry').then(r => r.json()).then(setData)
  }, [open, data])
  if (!open) return null
  return (
    <div className="px-[22px] py-5 border-t border-warm-100">
      {!data ? (
        <div className="h-16 flex items-center justify-center">
          <span className="text-caption text-warm-500">Loading…</span>
        </div>
      ) : (
        <LaundryForm currentName={data.laundry.name} laundryCode={data.laundry.laundryCode} />
      )}
    </div>
  )
}

function WorkflowPanel({ open }: { open: boolean }) {
  const [data, setData] = useState<{ settings: LaundrySettings } | null>(null)
  useEffect(() => {
    if (open && !data) fetch('/api/settings/workflow').then(r => r.json()).then(setData)
  }, [open, data])
  if (!open) return null
  return (
    <div className="px-[22px] py-5 border-t border-warm-100">
      {!data ? (
        <div className="h-16 flex items-center justify-center">
          <span className="text-caption text-warm-500">Loading…</span>
        </div>
      ) : (
        <WorkflowToggles settings={data.settings} />
      )}
    </div>
  )
}

function PricingModelPanel({ open }: { open: boolean }) {
  const [data, setData] = useState<{ settings: LaundrySettings } | null>(null)
  useEffect(() => {
    if (open && !data) fetch('/api/settings/workflow').then(r => r.json()).then(setData)
  }, [open, data])
  if (!open) return null
  return (
    <div className="px-[22px] py-5 border-t border-warm-100">
      {!data ? (
        <div className="h-16 flex items-center justify-center">
          <span className="text-caption text-warm-500">Loading…</span>
        </div>
      ) : (
        <PricingModelForm pricingModel={data.settings.pricingModel} />
      )}
    </div>
  )
}

function BranchesPanel({ open }: { open: boolean }) {
  const [data, setData] = useState<{ branches: { id: string; name: string }[]; plan: SubscriptionPlan; branchLimit: number } | null>(null)
  useEffect(() => {
    if (open && !data) fetch('/api/settings/branches').then(r => r.json()).then(setData)
  }, [open, data])
  if (!open) return null
  return (
    <div className="px-[22px] py-5 border-t border-warm-100">
      {!data ? (
        <div className="h-16 flex items-center justify-center">
          <span className="text-caption text-warm-500">Loading…</span>
        </div>
      ) : (
        <BranchesClient branches={data.branches} branchLimit={data.branchLimit} plan={data.plan} />
      )}
    </div>
  )
}

const ACCORDION_ITEMS: { key: PanelKey; label: string; desc: string }[] = [
  { key: 'laundry',      label: 'Laundry',       desc: 'Business name and laundry code' },
  { key: 'branches',     label: 'Branches',      desc: 'Manage branch locations and plan limits' },
  { key: 'pricingModel', label: 'Pricing Model', desc: 'Per item, per weight, or a mix of both' },
  { key: 'workflow',     label: 'Workflow',      desc: 'Express orders, pickup code and customer submissions' },
]

const NAV_ITEMS = [
  { href: '/settings/subscription', label: 'Subscription', desc: 'Plan, billing, upgrades and payment history' },
  { href: '/settings/sms-usage',    label: 'SMS Usage',    desc: 'Cycle usage, message log and quota' },
]

export default function SettingsPage() {
  const profile = useProfile()
  const [open, setOpen] = useState<PanelKey | null>(null)

  if (!profile) return null

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-[1180px] mx-auto px-7 py-7">
        <div className="mb-[18px]">
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Settings</h1>
          <p className="text-ui text-warm-800 mt-1">Manage your business, branches, messaging and plan.</p>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  function toggle(key: PanelKey) {
    setOpen(prev => prev === key ? null : key)
  }

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="mb-[18px]">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Settings</h1>
        <p className="text-ui text-warm-800 mt-1">Manage your business, branches, messaging and plan.</p>
      </div>

      <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
        {ACCORDION_ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="border-b border-warm-100 last:border-0">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-[22px] py-[18px] hover:bg-warm-50 transition-colors text-left"
            >
              <div>
                <p className="text-ui font-semibold text-warm-950">{label}</p>
                <p className="text-caption text-warm-700 mt-0.5">{desc}</p>
              </div>
              <ChevronIcon open={open === key} />
            </button>
            {key === 'laundry'      && <LaundryPanel      open={open === 'laundry'} />}
            {key === 'branches'     && <BranchesPanel     open={open === 'branches'} />}
            {key === 'pricingModel' && <PricingModelPanel open={open === 'pricingModel'} />}
            {key === 'workflow'     && <WorkflowPanel     open={open === 'workflow'} />}
          </div>
        ))}

        {NAV_ITEMS.map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-[22px] py-[18px] border-b border-warm-100 last:border-0 hover:bg-warm-50 transition-colors"
          >
            <div>
              <p className="text-ui font-semibold text-warm-950">{label}</p>
              <p className="text-caption text-warm-700 mt-0.5">{desc}</p>
            </div>
            <ChevronIcon open={false} />
          </Link>
        ))}
      </div>
    </div>
  )
}
