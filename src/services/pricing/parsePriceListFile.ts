import ExcelJS from 'exceljs'

export interface RawRow {
  service: string
  itemType: string
  unit: string
  minPrice: string
  maxPrice: string
  notes: string
  rowNumber: number
}

interface ColIndex {
  service?: number
  itemType?: number
  unit?: number
  minPrice?: number
  maxPrice?: number
  /** Legacy single-price template from before min/max — treated as both bounds. */
  legacyPrice?: number
  notes?: number
}

function matchHeader(colIndex: ColIndex, val: string, colNumber: number) {
  if (val === 'service') colIndex.service = colNumber
  else if (val === 'item type' || val === 'itemtype') colIndex.itemType = colNumber
  else if (val === 'unit') colIndex.unit = colNumber
  else if (val === 'min price' || val === 'min price (ghs)' || val === 'minprice') colIndex.minPrice = colNumber
  else if (val === 'max price' || val === 'max price (ghs)' || val === 'maxprice') colIndex.maxPrice = colNumber
  else if (val === 'notes') colIndex.notes = colNumber
  else if (val === 'price') colIndex.legacyPrice = colNumber
}

function parseCsv(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const colIndex: ColIndex = {}
  header.forEach((h, i) => matchHeader(colIndex, h, i))

  const get = (cols: string[], col?: number) => col !== undefined ? cols[col] ?? '' : ''

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    const minPrice = colIndex.minPrice !== undefined ? get(cols, colIndex.minPrice) : get(cols, colIndex.legacyPrice)
    const maxPrice = colIndex.maxPrice !== undefined ? get(cols, colIndex.maxPrice) : get(cols, colIndex.legacyPrice)
    rows.push({
      service: get(cols, colIndex.service),
      itemType: get(cols, colIndex.itemType),
      unit: get(cols, colIndex.unit),
      minPrice,
      maxPrice,
      notes: get(cols, colIndex.notes),
      rowNumber: i + 1,
    })
  }
  return rows
}

async function parseXlsx(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook()
  // exceljs's bundled Buffer type predates @types/node's generic Buffer<TArrayBuffer>,
  // so the two declarations don't structurally match even though this is a real
  // Buffer at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const colIndex: ColIndex = {}
  sheet.getRow(1).eachCell((cell, colNumber) => {
    matchHeader(colIndex, String(cell.value ?? '').trim().toLowerCase(), colNumber)
  })

  const get = (row: ExcelJS.Row, col?: number) => col ? String(row.getCell(col).value ?? '').trim() : ''

  const rows: RawRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const service = get(row, colIndex.service)
    const itemType = get(row, colIndex.itemType)
    const minPrice = get(row, colIndex.minPrice ?? colIndex.legacyPrice)
    const maxPrice = get(row, colIndex.maxPrice ?? colIndex.legacyPrice)
    if (!service && !itemType && !minPrice && !maxPrice) return
    rows.push({ service, itemType, unit: get(row, colIndex.unit), minPrice, maxPrice, notes: get(row, colIndex.notes), rowNumber })
  })
  return rows
}

export async function parsePriceListFile(file: File): Promise<RawRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsv(await file.text())
  }
  return parseXlsx(Buffer.from(await file.arrayBuffer()))
}
