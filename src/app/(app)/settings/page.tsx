import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'

export default async function SettingsPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <Link href="/settings/laundry" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Laundry</p>
            <p className="text-xs text-gray-400 mt-0.5">Laundry name and code</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/settings/branches" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Branches</p>
            <p className="text-xs text-gray-400 mt-0.5">Manage branch locations, plan limits</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/settings/workflow" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Workflow</p>
            <p className="text-xs text-gray-400 mt-0.5">Partial payments, express orders, pickup code</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/settings/subscription" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Subscription</p>
            <p className="text-xs text-gray-400 mt-0.5">Plan, billing, upgrades, payment history</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/settings/sms-usage" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">SMS Usage</p>
            <p className="text-xs text-gray-400 mt-0.5">Cycle usage, message log, quota</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
      </div>
    </div>
  )
}
