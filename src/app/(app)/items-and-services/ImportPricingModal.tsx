'use client'

import { useRef, useState, useTransition } from 'react'
import { parsePricingImport, commitPricingImport, type ImportPreviewRow } from '@/services/pricing/importPricing'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toast'

const AI_PROMPT = `You are helping me convert a laundry's pricing list into a specific CSV format for import.

Output ONLY a CSV with this exact header and no extra commentary:
Service,Item Type,Unit,Price

Rules:
- One row per (Service, Item Type, Price) combination.
- "Unit" is either "kg" or "item" (lowercase, no quotes).
- A "kg" row means that service is priced by total weight. Leave "Item Type" blank on kg rows.
- An "item" row means that specific item type has its own per-piece price under that service.
- If a service is priced by weight for everything EXCEPT a few item types that have their
  own per-piece price, output ONE "kg" row for that service (Item Type blank) PLUS one
  "item" row per exception item type.
- "Price" is a plain number, no currency symbol, using a period as the decimal separator.
- Use the exact service names and item type names as I use them below — do not rename,
  merge, or "clean up" spelling; if I misspell something, keep my spelling.

Here is my raw pricing information, convert it to the CSV format above:

<PASTE YOUR MESSY PRICING NOTES HERE>`

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ImportPricingModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [rows, setRows] = useState<ImportPreviewRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
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

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      onImported()
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

          <details className="text-caption text-warm-600">
            <summary className="cursor-pointer text-brand hover:text-brand-hover">
              Have raw pricing notes instead? Use this AI prompt
            </summary>
            <div className="mt-2 space-y-2">
              <pre className="whitespace-pre-wrap bg-[#F8F5F0] border border-warm-200 rounded-7 p-3 text-[12px] leading-relaxed text-warm-800 max-h-48 overflow-y-auto">
                {AI_PROMPT}
              </pre>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-caption text-brand hover:text-brand-hover underline underline-offset-2"
              >
                {copied ? 'Copied!' : 'Copy prompt'}
              </button>
              <p className="text-caption text-warm-500">
                Paste this into any AI chat tool along with your pricing notes, save the
                output as a .csv file, and upload it above.
              </p>
            </div>
          </details>

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
