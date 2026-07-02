'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { LaundryForm } from './LaundryForm'

export default function LaundrySettingsPage() {
  const [data, setData] = useState<{ laundry: { id: string; name: string; laundryCode: string } } | null>(null)

  useEffect(() => {
    fetch('/api/settings/laundry').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <PageSkeleton rows={2} />

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Laundry</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Laundry Details</h2>
        <LaundryForm currentName={data.laundry.name} laundryCode={data.laundry.laundryCode} />
      </div>
    </div>
  )
}
