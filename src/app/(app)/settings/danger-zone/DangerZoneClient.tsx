'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteLaundryAccount } from '@/services/laundries/deleteLaundryAccount'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DangerZoneClient({ laundryName }: { laundryName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await deleteLaundryAccount()
      if (res.success) {
        router.push('/login')
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="bg-error-bg border border-error-border rounded-10 p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#B0413A" className="shrink-0 mt-0.5" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 9a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 16Z" />
        </svg>
        <p className="text-ui-sm text-error-fg leading-relaxed">
          Permanently closes <strong>{laundryName}</strong>&apos;s Rinsion account. Every employee — including you —
          will be signed out and blocked from logging back in. Unlike other deletions in this app, there&apos;s no
          Recycle Bin entry for this; restoring it would require direct database access. Treat this as effectively
          permanent.
        </p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="w-full min-h-[48px] bg-error text-[#FFF6F1] text-ui font-semibold rounded-10 hover:bg-[#9A3730] transition-colors"
      >
        Delete laundry account
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setError(null) }}
        title="Delete laundry account"
        message={`This closes ${laundryName}'s entire Rinsion account for every employee. Type the laundry's name to confirm.`}
        confirmLabel="Delete account"
        requireTypedText={laundryName}
        isPending={isPending}
        error={error}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
