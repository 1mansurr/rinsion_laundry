'use client'

// Re-exports sonner's toast function + a positioned Toaster wrapper.
// Usage: import { toast } from '@/components/ui/Toast'
//        toast.success('Order created')
// Mount <ToastProvider /> once in layout or a root client component.
//
// Undo pattern ("Order deleted. [Undo]"): sonner's toast() already accepts
// an `action` option, e.g. toast.success('Order deleted', { action: { label:
// 'Undo', onClick: () => restoreOrder(id) } }) — no extension needed here.

import { Toaster } from 'sonner'
export { toast } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '14.5px',
        },
        classNames: {
          toast: 'rounded-10 border border-warm-300 bg-white text-warm-950',
          actionButton: '!bg-brand !text-[#FAF8F5]',
          success: 'border-success-border',
          error: 'border-error-border',
          warning: 'border-warning-border',
          info: 'border-info-border',
        },
      }}
    />
  )
}
