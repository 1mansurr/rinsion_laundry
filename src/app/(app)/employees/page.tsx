'use client'
import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { EmployeesClient } from './EmployeesClient'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'
import type { Employee } from '@/services/employees'
import type { PendingJoinRequest } from '@/services/laundries/joinRequests'

type PageData = {
  restricted?: boolean
  employees: Employee[]
  branches: { id: string; name: string }[]
  plan: SubscriptionPlan
  limit: number
  activeCount: number
  pendingRequests: PendingJoinRequest[]
  currentEmployeeId: string
  isMultiBranch: boolean
}

export default function EmployeesPage() {
  const [data, setData] = useState<PageData | null>(null)

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <PageSkeleton />

  if (data.restricted) {
    return (
      <div className="max-w-[1180px] mx-auto px-7 py-7">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight mb-[18px]">Team</h1>
        <RestrictedCard />
      </div>
    )
  }

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="flex items-end justify-between mb-[18px]">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Team</h1>
          <p className="text-ui text-warm-800 mt-1">People with access to Rinsion across your branches.</p>
        </div>
        <p className="text-label text-warm-600">{data.activeCount} of {data.limit} slots used</p>
      </div>
      <EmployeesClient
        employees={data.employees}
        branches={data.branches}
        activeCount={data.activeCount}
        employeeLimit={data.limit}
        pendingRequests={data.pendingRequests}
        currentEmployeeId={data.currentEmployeeId}
        isMultiBranch={data.isMultiBranch}
      />
    </div>
  )
}
