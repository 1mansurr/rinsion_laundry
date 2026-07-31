'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser'

// Live while this page is open only — no OS-level push this phase (docs/new.md
// decision #6). Ticks up on a Realtime INSERT and resets when the rider next
// visits /rider/jobs (markNotificationsRead.ts re-fetches initialCount as 0).
export function NotificationBadge({ riderId, initialCount }: { riderId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`rider-notifications-${riderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rider_notifications', filter: `rider_id=eq.${riderId}` },
        () => setCount(c => c + 1)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [riderId])

  if (count === 0) return null

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}
