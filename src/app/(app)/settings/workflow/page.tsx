import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSettings } from '@/services/settings/getSettings'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { Card } from '@/components/ui/Card'
import { WorkflowToggles } from './WorkflowToggles'

export default async function WorkflowSettingsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/settings" className="text-sm text-warm-600 hover:text-warm-800">Settings</Link>
          <span className="text-warm-400">/</span>
          <h1 className="text-sm font-semibold text-warm-950">Workflow</h1>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const settings = await getSettings()
  if (!settings) redirect('/login')

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-warm-600 hover:text-warm-800">Settings</Link>
        <span className="text-warm-400">/</span>
        <h1 className="text-sm font-semibold text-warm-950">Workflow</h1>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-warm-950 mb-1">Workflow Settings</h2>
        <p className="text-xs text-warm-600 mb-5">Changes apply immediately to all staff.</p>
        <WorkflowToggles settings={settings} />
      </Card>
    </div>
  )
}
