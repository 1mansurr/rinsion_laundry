'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { WorkflowToggles } from './WorkflowToggles'
import type { LaundrySettings } from '@/services/settings'

export default function WorkflowSettingsPage() {
  const [data, setData] = useState<{ settings: LaundrySettings } | null>(null)

  useEffect(() => {
    fetch('/api/settings/workflow').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <PageSkeleton rows={2} />

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Workflow</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Workflow Settings</h2>
        <p className="text-xs text-gray-400 mb-5">Changes apply immediately to all staff.</p>
        <WorkflowToggles settings={data.settings} />
      </div>
    </div>
  )
}
