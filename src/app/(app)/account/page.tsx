import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSettings } from '@/services/settings/getSettings'
import { signOut } from '@/app/login/actions'

const ROW_ICONS: Record<string, string> = {
  customers: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3-3.6-5.5-8-5.5Z',
  payments: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  team: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  itemsServices: 'M12.4 2.4 21 11l-9.6 9.6a2 2 0 0 1-2.8 0L3 15V3h12l-.6-.6ZM7 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  reports: 'M5 21V10h3v11H5Zm6 0V3h3v18h-3Zm6 0v-7h3v7h-3Z',
  settings: 'M19.14 12.94a7.14 7.14 0 0 0 .06-.94 7.14 7.14 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.4.32.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.09.47 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  pickupRequests: 'M12 2 2 7v10l10 5 10-5V7l-10-5zm0 2.2 6.9 3.4L12 11l-6.9-3.4L12 4.2zM4 8.9l7 3.5v7.4l-7-3.5V8.9zm9 10.9v-7.4l7-3.5v7.4l-7 3.5z',
  support: 'M12 2a10 10 0 1 0 6.2 17.9L21 21l-.9-2.9A10 10 0 0 0 12 2Zm-4 9a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 8 11Zm4 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 12 11Zm4 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z',
  legal: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM7 12h10v1.5H7V12Zm0 4h10v1.5H7V16Zm0-8h5v1.5H7V8Z',
}

function RowIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#6B6259" className="shrink-0" aria-hidden>
      <path d={ROW_ICONS[name]} />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#CDC7BD" className="shrink-0" aria-hidden>
      <path d="M8.5 5 7 6.5 12.5 12 7 17.5 8.5 19l7-7-7-7Z" />
    </svg>
  )
}

function Row({ href, icon, label, desc, external }: { href: string; icon: string; label: string; desc?: string; external?: boolean }) {
  const content = (
    <>
      <RowIcon name={icon} />
      <div className="flex-1">
        <p className="text-ui font-semibold text-warm-950">{label}</p>
        {desc && <p className="text-caption text-warm-700 mt-0.5">{desc}</p>}
      </div>
      <ChevronRight />
    </>
  )
  const className = 'flex items-center gap-3.5 px-[22px] py-[18px] border-b border-warm-100 last:border-0 hover:bg-warm-50 transition-colors'
  if (external) {
    return <a href={href} target="_blank" rel="noopener" className={className}>{content}</a>
  }
  return <Link href={href} className={className}>{content}</Link>
}

export default async function AccountPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const isAdmin = profile.role === 'admin'
  const settings = await getSettings()
  const showPickupRequests = settings?.allowCustomerSubmissions ?? false
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="max-w-[1180px] mx-auto px-4 py-4 md:px-7 md:py-7">
      <div className="mb-[18px] flex items-center gap-3.5">
        <span className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-ui flex-shrink-0">
          {initials}
        </span>
        <div>
          <h1 className="text-[20px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">{profile.laundryName}</h1>
          <p className="text-caption text-warm-700 mt-0.5">{profile.firstName} {profile.lastName} <span className="capitalize">· {profile.role}</span></p>
        </div>
      </div>

      <div className="bg-white border border-warm-300 rounded-18 overflow-hidden mb-4">
        <Row href="/customers" icon="customers" label="Customers" desc="Search, view and manage customer records" />
        <Row href="/payments" icon="payments" label="Payments" desc="Payment history across all orders" />
        {isAdmin && <Row href="/employees" icon="team" label="Team" desc="Invite staff, manage roles and access" />}
        {showPickupRequests && <Row href="/pickup-requests" icon="pickupRequests" label="Pickup Requests" desc="Customer-submitted pickup requests" />}
      </div>

      {isAdmin && (
        <div className="bg-white border border-warm-300 rounded-18 overflow-hidden mb-4">
          <Row href="/items-and-services" icon="itemsServices" label="Items & Services" desc="Pricing and catalog management" />
          <Row href="/reports" icon="reports" label="Reports" desc="Revenue, orders and activity" />
          <Row href="/settings" icon="settings" label="Settings" desc="Business, branches, plan and workflow" />
        </div>
      )}

      <div className="bg-white border border-warm-300 rounded-18 overflow-hidden mb-4">
        <Row href="https://wa.me/233257528042" icon="support" label="Help & Support" desc="Message us on WhatsApp" external />
        <Row href="/#faq" icon="support" label="Frequently Asked Questions" desc="Answers to common questions" />
        <Row href="/terms" icon="legal" label="Terms of Service" desc="Terms you agreed to when signing up" />
        <Row href="/privacy" icon="legal" label="Privacy Policy" desc="How your and your customers' data is handled" />
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-[22px] py-[16px] bg-white border border-warm-300 rounded-18 text-ui font-semibold text-error hover:bg-error-bg transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
