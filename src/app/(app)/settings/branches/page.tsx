'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { BranchesClient } from './BranchesClient'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export default function BranchesPage() {
  const [data, setData] = useState<{ branches: any[]; plan: SubscriptionPlan; branchLimit: number } | null>(null)

  useEffect(() => {
    fetch('/api/settings/branches').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <PageSkeleton rows={3} />

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Branches</h1>
      </div>

      <BranchesClient
        branches={data.branches}
        branchLimit={data.branchLimit}
        plan={data.plan}
      />
    </div>
  )
}
