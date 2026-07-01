'use client'

// Bottom sheet: slides up from bottom on mobile (and narrow desktop).
// Uses @radix-ui/react-dialog for focus trap + Esc key dismiss.
// Animation: animate-sheet-up (defined in tailwind.config.ts keyframes).

import * as Dialog from '@radix-ui/react-dialog'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Dialog.Content
          className="fixed z-50 bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-sheet animate-sheet-up focus:outline-none max-h-[90dvh] overflow-y-auto"
          aria-modal
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-9 h-1 rounded-full bg-warm-300" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-warm-200">
              <Dialog.Title className="text-h2 font-semibold text-warm-950">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="w-8 h-8 flex items-center justify-center rounded-7 text-warm-600 hover:bg-warm-100 transition-colors focus:outline-none focus:shadow-focus-ring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-4 pb-[env(safe-area-inset-bottom,16px)]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
