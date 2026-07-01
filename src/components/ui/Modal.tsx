'use client'

import * as Dialog from '@radix-ui/react-dialog'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  maxWidth?: string // default: 'max-w-md'
  children: React.ReactNode
}

export function Modal({ open, onClose, title, description, maxWidth = 'max-w-md', children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        {/* Scrim */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-none data-[state=open]:animate-none" />

        {/* Panel */}
        <Dialog.Content
          className={`
            fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-[calc(100%-2rem)] ${maxWidth}
            bg-white rounded-[12px] shadow-modal
            focus:outline-none
          `}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 pt-6 pb-4 border-b border-warm-200">
              {title && (
                <Dialog.Title className="text-h2 font-semibold text-warm-950">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="mt-1 text-body text-warm-700">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5">{children}</div>

          {/* Close × */}
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-7 text-warm-600 hover:bg-warm-100 transition-colors focus:outline-none focus:shadow-focus-ring"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
