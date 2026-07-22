import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getLaundry } from '@/services/settings/getLaundry'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { Card } from '@/components/ui/Card'
import { LaundryForm } from './LaundryForm'

export default async function LaundrySettingsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/settings" className="text-sm text-warm-600 hover:text-warm-800">Settings</Link>
          <span className="text-warm-400">/</span>
          <h1 className="text-sm font-semibold text-warm-950">Laundry</h1>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const laundry = await getLaundry()
  if (!laundry) redirect('/login')

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-warm-600 hover:text-warm-800">Settings</Link>
        <span className="text-warm-400">/</span>
        <h1 className="text-sm font-semibold text-warm-950">Laundry</h1>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-warm-950 mb-4">Laundry Details</h2>
        <LaundryForm currentName={laundry.name} laundryCode={laundry.laundryCode} joinPin={laundry.joinPin} />
      </Card>
    </div>
  )
}
