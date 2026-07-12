'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
  /** When set, Confirm stays disabled until the input exactly matches this text. */
  requireTypedText?: string
  /** Shown inline above the buttons — for a failed confirm, without closing the dialog. */
  error?: string | null
}

export function ConfirmDialog({
  open, onClose, title, message, confirmLabel = 'Delete', isPending = false, onConfirm, requireTypedText, error,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const canConfirm = !requireTypedText || typed === requireTypedText

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-body text-warm-700">{message}</p>
        {error && <p className="text-caption text-error-fg">{error}</p>}
        {requireTypedText && (
          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">
              Type <span className="font-semibold">{requireTypedText}</span> to confirm
            </label>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className="w-full border border-warm-400 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
              autoFocus
            />
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="destructive"
            filled
            isPending={isPending}
            disabled={isPending || !canConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
