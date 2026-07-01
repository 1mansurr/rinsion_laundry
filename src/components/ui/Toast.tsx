'use client'

// Re-exports sonner's toast function + a positioned Toaster wrapper.
// Usage: import { toast } from '@/components/ui/Toast'
//        toast.success('Order created')
// Mount <ToastProvider /> once in layout or a root client component.

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
          borderRadius: '9px',
          border: '1px solid #E8E4DD',
          background: '#fff',
          color: '#1A1A1A',
        },
        classNames: {
          success: 'border-success-border',
          error: 'border-error-border',
          warning: 'border-warning-border',
          info: 'border-info-border',
        },
      }}
    />
  )
}
