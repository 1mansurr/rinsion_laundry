'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCustomer } from '@/services/customers/deleteCustomer'
import { restoreCustomer } from '@/services/customers/restoreCustomer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

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
      toast.success('Customer deleted', {
        action: { label: 'Undo', onClick: () => restoreCustomer(customerId) },
      })
    })
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setError(null) }}
        title="Delete customer"
        message={`Delete ${customerName}? This can be undone from Settings → Recycle Bin.`}
        confirmLabel="Delete customer"
        isPending={isPending}
        error={error}
        onConfirm={handleConfirm}
      />
    </>
  )
}
