'use server'

import { requirePlatformAdmin } from './requirePlatformAdmin'
import { parsePriceListFile, type RawRow } from '@/services/pricing/parsePriceListFile'
import type { TemplateService, TemplatePriceCell } from './templates'
import type { PricingModel } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface ProvisionImportRow {
  rowNumber: number
  serviceName: string
  itemTypeName: string | null
  unit: 'kg' | 'item'
  minPrice: number
  maxPrice: number
  notes: string | null
  error?: string
}

export interface ProvisionImportPreview {
  rows: ProvisionImportRow[]
  validCount: number
  errorCount: number
  itemTypes: string[]
  services: TemplateService[]
  prices: TemplatePriceCell[]
  /** Inferred from the services' individual modes — per_item/per_kg if uniform, mixed otherwise. */
  pricingModel: PricingModel
}

function toRow(r: RawRow): ProvisionImportRow {
  const serviceName = r.service.trim()
  const unitRaw = r.unit.trim().toLowerCase()
  const notes = r.notes.trim() || null
  const minPriceNum = parseFloat(r.minPrice)
  // Blank Max Price is a convenience for a fixed price: it falls back to Min.
  const maxPriceNum = r.maxPrice.trim() ? parseFloat(r.maxPrice) : minPriceNum

  const base = { rowNumber: r.rowNumber, serviceName, itemTypeName: null, minPrice: 0, maxPrice: 0, notes } as const

  if (!serviceName) return { ...base, unit: 'item', error: 'Missing service name.' }
  if (unitRaw !== 'kg' && unitRaw !== 'item') {
    return { ...base, unit: 'item', error: `Unit must be "kg" or "item", got "${r.unit || '(blank)'}".` }
  }
  const unit = unitRaw // narrowed to 'kg' | 'item' by the guard above
  if (isNaN(minPriceNum) || minPriceNum < 0) return { ...base, unit, error: `Invalid Min Price "${r.minPrice}".` }
  if (isNaN(maxPriceNum) || maxPriceNum < 0) return { ...base, unit, error: `Invalid Max Price "${r.maxPrice}".` }
  if (maxPriceNum < minPriceNum) {
    return { ...base, unit, minPrice: minPriceNum, maxPrice: maxPriceNum, error: 'Max Price must be >= Min Price.' }
  }

  const itemTypeName = unit === 'item' ? r.itemType.trim() : null
  if (unit === 'item' && !itemTypeName) {
    return { ...base, unit: 'item', minPrice: minPriceNum, maxPrice: maxPriceNum, error: 'Item rows must include an Item Type.' }
  }

  return { rowNumber: r.rowNumber, serviceName, itemTypeName, unit, minPrice: minPriceNum, maxPrice: maxPriceNum, notes }
}

export async function parseProvisionPriceList(formData: FormData): Promise<ServiceResult<ProvisionImportPreview>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No file uploaded.' }
  }

  let rawRows: RawRow[]
  try {
    rawRows = await parsePriceListFile(file)
  } catch {
    return { success: false, error: 'Could not read that file. Make sure it is a valid .xlsx or .csv export.' }
  }
  if (rawRows.length === 0) return { success: false, error: 'No rows found in that file.' }

  const rows = rawRows.map(toRow)

  // A service can have at most one kg (weight) row — that row sets its rate.
  // Item rows for the same service are allowed alongside it (per-item
  // exceptions to an otherwise weight-priced service).
  const kgRowSeen = new Set<string>()
  for (const row of rows) {
    if (row.error || row.unit !== 'kg') continue
    const key = row.serviceName.toLowerCase()
    if (kgRowSeen.has(key)) {
      row.error = `Duplicate weight rate for "${row.serviceName}" — a service can only have one kg row.`
      continue
    }
    kgRowSeen.add(key)
  }

  const validRows = rows.filter(r => !r.error)
  const errorCount = rows.length - validRows.length

  const serviceOrder: string[] = []
  const serviceByKey = new Map<string, TemplateService>()
  for (const row of validRows) {
    const key = row.serviceName.toLowerCase()
    if (!serviceByKey.has(key)) {
      serviceOrder.push(key)
      serviceByKey.set(key, { name: row.serviceName, pricingMode: 'per_item' })
    }
    if (row.unit === 'kg') {
      serviceByKey.set(key, {
        name: row.serviceName,
        pricingMode: 'per_kg',
        kgRate: { min: row.minPrice, max: row.maxPrice },
        notes: row.notes,
      })
    }
  }
  const services = serviceOrder.map(k => serviceByKey.get(k)!)

  const itemTypeOrder: string[] = []
  const itemTypeSeen = new Set<string>()
  for (const row of validRows) {
    if (row.unit !== 'item' || !row.itemTypeName) continue
    const key = row.itemTypeName.toLowerCase()
    if (!itemTypeSeen.has(key)) {
      itemTypeSeen.add(key)
      itemTypeOrder.push(row.itemTypeName)
    }
  }

  const prices: TemplatePriceCell[] = validRows
    .filter((r): r is ProvisionImportRow & { itemTypeName: string } => r.unit === 'item' && !!r.itemTypeName)
    .map(r => ({ itemType: r.itemTypeName, service: r.serviceName, min: r.minPrice, max: r.maxPrice, notes: r.notes }))

  const modes = new Set(services.map(s => s.pricingMode))
  const pricingModel: PricingModel = modes.size === 0 ? 'per_item' : modes.size > 1 ? 'mixed' : Array.from(modes)[0]

  return {
    success: true,
    data: { rows, validCount: validRows.length, errorCount, itemTypes: itemTypeOrder, services, prices, pricingModel },
  }
}
