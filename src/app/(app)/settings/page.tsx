'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { LaundryForm } from './laundry/LaundryForm'
import { WorkflowToggles } from './workflow/WorkflowToggles'
import { BranchesClient } from './branches/BranchesClient'
import { PricingModelForm } from './pricing-model/PricingModelForm'
import type { LaundrySettings } from '@/services/settings/getSettings'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

type PanelKey = 'laundry' | 'workflow' | 'branches' | 'pricingModel'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="#9A9088"
      className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M12 15.5 5.5 9 7 7.5l5 5 5-5L18.5 9 12 15.5Z" />
    </svg>
  )
}

const ROW_ICONS: Record<string, string> = {
  laundry: 'M4 21V7l8-4 8 4v14h-5v-7H9v7H4Z',
  branches: 'M12 2C8 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
  pricingModel: 'M12.4 2.4 21 11l-9.6 9.6a2 2 0 0 1-2.8 0L3 15V3h12l-.6-.6ZM7 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  workflow: 'M11 2 3 14h7l-1 8 10-14h-7l1-6Z',
  subscription: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 3v9h14V9H5Zm2 5a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2H7Z',
  smsUsage: 'M12 2a10 10 0 1 0 6.2 17.9L21 21l-.9-2.9A10 10 0 0 0 12 2Zm-4 9a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 8 11Zm4 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 12 11Zm4 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z',
  recycleBin: 'M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2h-1.07l-.86 12.06A2 2 0 0 1 16.08 22H7.92a2 2 0 0 1-1.99-1.94L5.07 8H4a1 1 0 0 1 0-2h3Zm2 0h6V4H9v2Z',
  dangerZone: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 9a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 16Z',
}

function RowIcon({ name, danger }: { name: string; danger?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={danger ? '#B0413A' : '#6B6259'} className="shrink-0" aria-hidden>
      <path d={ROW_ICONS[name]} />
    </svg>
  )
}

function LaundryPanel({ open }: { open: boolean }) {
  const [data, setData] = useState<{ laundry: { name: string; laundryCode: string; joinPin: string } } | null>(null)
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
        <LaundryForm currentName={data.laundry.name} laundryCode={data.laundry.laundryCode} joinPin={data.laundry.joinPin} />
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
        <PricingModelForm pricingModel={data.settings.pricingModel} taxRate={data.settings.taxRate} />
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
  { href: '/settings/subscription', label: 'Subscription', desc: 'Plan, billing, upgrades and payment history', icon: 'subscription' },
  { href: '/settings/sms-usage',    label: 'SMS Usage',    desc: 'Cycle usage, message log and quota', icon: 'smsUsage' },
  { href: '/settings/recycle-bin',  label: 'Recycle Bin',  desc: 'Restore deleted customers, orders, items and services', icon: 'recycleBin' },
  { href: '/settings/danger-zone',  label: 'Danger Zone',  desc: "Permanently close this laundry's Rinsion account", icon: 'dangerZone', danger: true },
]

export default function SettingsPage() {
  const profile = useProfile()
  const [open, setOpen] = useState<PanelKey | null>(null)

  if (!profile) return null

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-[1180px] mx-auto px-4 py-4 md:px-7 md:py-7">
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
    <div className="max-w-[1180px] mx-auto px-4 py-4 md:px-7 md:py-7">
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
              className="w-full flex items-center gap-3.5 px-[22px] py-[18px] hover:bg-warm-50 transition-colors text-left"
            >
              <RowIcon name={key} />
              <div className="flex-1">
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

        {NAV_ITEMS.map(({ href, label, desc, icon, danger }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 px-[22px] py-[18px] border-b border-warm-100 last:border-0 hover:bg-warm-50 transition-colors"
          >
            <RowIcon name={icon} danger={danger} />
            <div className="flex-1">
              <p className={`text-ui font-semibold ${danger ? 'text-error' : 'text-warm-950'}`}>{label}</p>
              <p className="text-caption text-warm-700 mt-0.5">{desc}</p>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#CDC7BD" className="shrink-0" aria-hidden>
              <path d="M8.5 5 7 6.5 12.5 12 7 17.5 8.5 19l7-7-7-7Z" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
