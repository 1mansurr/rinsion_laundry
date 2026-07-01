import { getMyProfile } from '@/services/employees/getMyProfile'
import { getLaundry } from '@/services/settings'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LaundryForm } from './LaundryForm'

export default async function LaundrySettingsPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

  const laundry = await getLaundry()
  if (!laundry) return null

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Laundry</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Laundry Details</h2>
        <LaundryForm currentName={laundry.name} laundryCode={laundry.laundryCode} />
      </div>
    </div>
  )
}
