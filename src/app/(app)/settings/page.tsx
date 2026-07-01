import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { RestrictedCard } from '@/components/app/RestrictedCard'

export default async function SettingsPage() {
  const profile = await getMyProfile()
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

  const SETTINGS_LINKS = [
    { href: '/settings/laundry',      label: 'Laundry',      desc: 'Business name, SMS sender name and code' },
    { href: '/settings/branches',     label: 'Branches',     desc: 'Manage branch locations, plan limits' },
    { href: '/settings/workflow',     label: 'Workflow',     desc: 'Partial payments, express orders, pickup code' },
    { href: '/settings/subscription', label: 'Subscription', desc: 'Plan, billing, upgrades and payment history' },
    { href: '/settings/sms-usage',    label: 'SMS Usage',    desc: 'Cycle usage, message log, quota' },
  ]

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="mb-[18px]">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Settings</h1>
        <p className="text-ui text-warm-800 mt-1">Manage your business, branches, messaging and plan.</p>
      </div>

      <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
        {SETTINGS_LINKS.map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-[22px] py-[18px] border-b border-warm-100 last:border-0 hover:bg-warm-50 transition-colors"
          >
            <div>
              <p className="text-ui font-semibold text-warm-950">{label}</p>
              <p className="text-caption text-warm-700 mt-0.5">{desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#C7C0B6">
              <path d="M9 6.4 14.6 12 9 17.6 10.4 19l7-7-7-7L9 6.4Z" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
