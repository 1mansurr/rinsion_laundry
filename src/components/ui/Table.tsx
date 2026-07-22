'use client'

// CSS grid-based table (not semantic <table>) per prototype markup.
// Table header bg: #F8F5F0 (prototypes) — no exact token match, use arbitrary value.

export interface ColumnDef<T> {
  key: string
  header: string
  width?: string       // e.g. "1fr", "120px", "2fr"
  align?: 'left' | 'right' | 'center'
  cell: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptySlot?: React.ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptySlot,
  className = '',
}: DataTableProps<T>) {
  const templateColumns = columns.map((c) => c.width ?? '1fr').join(' ')
  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

  return (
    <div className={`w-full rounded-18 border border-warm-300 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="grid border-b border-warm-300 bg-[#F8F5F0]"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`px-4 py-3 text-label font-semibold text-warm-800 tracking-table uppercase ${alignClass[col.align ?? 'left']}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-warm-600 text-body">
          {emptySlot ?? 'No results'}
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={getRowKey(row)}
            className={`
              grid border-b border-warm-200 last:border-b-0
              ${onRowClick ? 'cursor-pointer hover:bg-warm-50 transition-colors' : ''}
              ${i % 2 === 0 ? '' : ''}
            `}
            style={{ gridTemplateColumns: templateColumns }}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) } }
                : undefined
            }
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={`px-4 py-3.5 text-ui text-warm-950 flex items-center ${alignClass[col.align ?? 'left']}`}
              >
                {col.cell(row)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
