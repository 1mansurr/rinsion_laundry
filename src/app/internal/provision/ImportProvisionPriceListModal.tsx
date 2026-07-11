'use client'

import { useRef, useState, useTransition } from 'react'
import { parseProvisionPriceList, type ProvisionImportPreview, type ProvisionImportRow } from '@/services/platform/parseProvisionPriceList'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'

interface Props {
  open: boolean
  onClose: () => void
  onImported: (preview: ProvisionImportPreview) => void
}

export function ImportProvisionPriceListModal({ open, onClose, onImported }: Props) {
  const [preview, setPreview] = useState<ProvisionImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPreview(null)
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
      const res = await parseProvisionPriceList(formData)
      if (!res.success) { setError(res.error); return }
      setPreview(res.data)
    })
  }

  function handleConfirm() {
    if (!preview) return
    onImported(preview)
    handleClose()
  }

  const validRows = preview?.rows.filter(r => !r.error) ?? []
  const errorRows = preview?.rows.filter(r => r.error) ?? []

  const columns: ColumnDef<ProvisionImportRow>[] = [
    { key: 'row', header: '#', width: '40px', cell: r => r.rowNumber },
    { key: 'service', header: 'Service', width: '1.2fr', cell: r => r.serviceName },
    { key: 'item', header: 'Item Type', width: '1.2fr', cell: r => r.itemTypeName ?? '—' },
    { key: 'unit', header: 'Unit', width: '64px', cell: r => r.unit },
    { key: 'min', header: 'Min', width: '70px', align: 'right', cell: r => r.error ? '—' : r.minPrice.toFixed(2) },
    { key: 'max', header: 'Max', width: '70px', align: 'right', cell: r => r.error ? '—' : r.maxPrice.toFixed(2) },
    {
      key: 'status', header: 'Status', width: '1.4fr',
      cell: r => r.error
        ? <span className="text-caption text-error-fg">{r.error}</span>
        : <span className="text-caption font-medium text-brand">OK</span>,
    },
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={preview ? 'Review Import' : 'Import Price List'}
      description={preview
        ? `${validRows.length} valid row${validRows.length === 1 ? '' : 's'}${errorRows.length > 0 ? `, ${errorRows.length} with errors (will be skipped)` : ''} — pricing mode inferred: ${LABEL[preview.pricingModel]}`
        : 'Upload an Excel or CSV file to seed this laundry’s items, services, and prices — same format as the Items & Services import. Pricing mode (per item, per weight, or mixed) is inferred from the Unit column, one row per service/item combination.'}
      maxWidth={preview ? 'max-w-4xl' : 'max-w-lg'}
    >
      {!preview ? (
        <div className="space-y-4">
          <div>
            <label className="text-label font-medium text-warm-700 mb-1.5 block">File (.xlsx or .csv)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="w-full text-ui text-warm-800 file:mr-3 file:px-3 file:py-1.5 file:rounded-7 file:border file:border-warm-400 file:bg-white file:text-ui file:font-medium hover:file:bg-warm-100"
            />
            <p className="text-caption text-warm-400 mt-1.5">
              Columns: Service, Item Type, Unit (kg/item), Min Price, Max Price, Notes. Leave Item Type blank on a kg row.
            </p>
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
            <DataTable columns={columns} rows={preview.rows} getRowKey={r => String(r.rowNumber)} />
          </div>
          {error && <p className="text-caption text-error-fg">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={reset}>Back</Button>
            <Button
              variant="primary"
              disabled={validRows.length === 0}
              onClick={handleConfirm}
            >
              Use this list ({validRows.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const LABEL: Record<ProvisionImportPreview['pricingModel'], string> = {
  per_item: 'Per item',
  per_kg: 'Per weight',
  mixed: 'Mixed',
}
