'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

export function DataExportClient() {
  const [isPending, setIsPending] = useState(false)

  async function handleExport() {
    setIsPending(true)
    try {
      const res = await fetch('/api/settings/data-export')
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const dateStamp = new Date().toISOString().split('T')[0]
      const a = document.createElement('a')
      a.href = url
      a.download = `rinsion-data-export-${dateStamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not generate the export. Try again in a moment.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="bg-white border border-warm-300 rounded-18 p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#6B6259" className="shrink-0 mt-0.5" aria-hidden>
          <path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z" />
        </svg>
        <p className="text-ui-sm text-warm-800 leading-relaxed">
          Download every active record this laundry has in Rinsion — customers, employees, branches, orders, order
          items, payments, item types, and services — as a single spreadsheet, one sheet per category. Useful for
          your own records, a backup, or moving off Rinsion.
        </p>
      </div>
      <Button onClick={handleExport} isPending={isPending} className="w-full">
        Download data export (.xlsx)
      </Button>
    </div>
  )
}
