'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCustomer } from '@/services/customers/deleteCustomer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await deleteCustomer(customerId)
      if (!res.success) { setError(res.error); return }
      router.push('/customers')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center bg-white text-error-fg border border-[#E0BBB6] text-ui font-semibold px-[15px] py-[10px] rounded-12 hover:bg-[#F8ECEA] transition-colors"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setError(null) }}
        title="Delete customer"
        message={`Delete ${customerName}? This can be undone from Settings → Recycle Bin.`}
        isPending={isPending}
        error={error}
        onConfirm={handleConfirm}
      />
    </>
  )
}
