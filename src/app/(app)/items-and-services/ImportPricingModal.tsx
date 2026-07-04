'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { parsePricingImport, commitPricingImport, type ImportPreviewRow } from '@/services/pricing/importPricing'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful commit, in addition to router.refresh(). Use
   * for flows needing more than an in-place data refresh (e.g. onboarding
   * moving to its next step). */
  onImported?: () => void
}

export function ImportPricingModal({ open, onClose, onImported }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [rows, setRows] = useState<ImportPreviewRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setRows([])
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleParse() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) { setError('Choose a file first.'); return }
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    startTransition(async () => {
      const res = await parsePricingImport(formData)
      if (!res.success) { setError(res.error); return }
      if (res.data.rows.length === 0) { setError('No rows found in that file.'); return }
      setRows(res.data.rows)
      setStep('preview')
    })
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await commitPricingImport(rows)
      if (!res.success) { setError(res.error); return }
      const { servicesCreated, itemTypesCreated, kgRatesSet, pricesUpserted, failedRows } = res.data
      toast.success(
        `Import complete — ${kgRatesSet} kg rate${kgRatesSet === 1 ? '' : 's'}, ${pricesUpserted} item price${pricesUpserted === 1 ? '' : 's'} set` +
        (servicesCreated || itemTypesCreated ? ` (${servicesCreated} new service${servicesCreated === 1 ? '' : 's'}, ${itemTypesCreated} new item type${itemTypesCreated === 1 ? '' : 's'})` : '') +
        (failedRows > 0 ? `. ${failedRows} row${failedRows === 1 ? '' : 's'} failed.` : '.')
      )
      handleClose()
      router.refresh()
      onImported?.()
    })
  }

  const validRows = rows.filter(r => !r.error)
  const errorRows = rows.filter(r => r.error)

  const columns: ColumnDef<ImportPreviewRow>[] = [
    { key: 'row', header: '#', width: '48px', cell: r => r.rowNumber },
    { key: 'service', header: 'Service', width: '1.4fr', cell: r => r.serviceName },
    { key: 'item', header: 'Item Type', width: '1.4fr', cell: r => r.itemTypeName ?? '—' },
    { key: 'unit', header: 'Unit', width: '80px', cell: r => r.unit },
    { key: 'price', header: 'Price', width: '90px', align: 'right', cell: r => r.error ? '—' : r.price.toFixed(2) },
    {
      key: 'status', header: 'Status', width: '1.2fr',
      cell: r => r.error
        ? <span className="text-caption text-error-fg">{r.error}</span>
        : (
          <span className={`text-caption font-medium ${r.action === 'create' ? 'text-brand' : 'text-warm-500'}`}>
            {r.action === 'create' ? 'NEW' : 'update'}
          </span>
        ),
    },
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'upload' ? 'Import Pricing' : 'Review Import'}
      description={step === 'upload'
        ? 'Upload an Excel or CSV file to set prices in bulk instead of one at a time.'
        : `${validRows.length} valid row${validRows.length === 1 ? '' : 's'}${errorRows.length > 0 ? `, ${errorRows.length} with errors (will be skipped)` : ''}`}
      maxWidth={step === 'preview' ? 'max-w-2xl' : 'max-w-lg'}
    >
      {step === 'upload' ? (
        <div className="space-y-4">
          <a
            href="/api/items-and-services/pricing-template"
            className="inline-block text-caption text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            Download a template
          </a>

          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">File (.xlsx or .csv)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="w-full text-ui text-warm-800 file:mr-3 file:px-3 file:py-1.5 file:rounded-7 file:border file:border-warm-400 file:bg-white file:text-ui file:font-medium hover:file:bg-warm-100"
            />
          </div>

          {error && <p className="text-caption text-error-fg">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" isPending={isPending} disabled={isPending} onClick={handleParse}>
              Parse file
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[420px] overflow-y-auto">
            <DataTable columns={columns} rows={rows} getRowKey={r => String(r.rowNumber)} />
          </div>
          {error && <p className="text-caption text-error-fg">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={reset}>Back</Button>
            <Button
              variant="primary"
              isPending={isPending}
              disabled={isPending || validRows.length === 0}
              onClick={handleConfirm}
            >
              Confirm import ({validRows.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
