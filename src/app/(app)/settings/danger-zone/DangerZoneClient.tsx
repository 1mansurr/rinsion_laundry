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
    <div className="bg-white border border-red-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-red-700 mb-1">Delete laundry account</h2>
      <p className="text-sm text-gray-600 mb-4">
        Permanently closes {laundryName}&apos;s Rinsion account. Every employee — including you — will be signed out
        and blocked from logging back in. Unlike other deletions in this app, there&apos;s no Recycle Bin entry for
        this; restoring it would require direct database access. Treat this as effectively permanent.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white text-red-600 border border-red-300 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
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
