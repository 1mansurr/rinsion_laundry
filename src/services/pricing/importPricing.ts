'use server'

import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase'
import { createService, setServicePricing } from '@/services/services'
import { createItemType } from '@/services/items'
import { upsertPrice } from '@/services/pricing'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingModel } from '@/constants/statuses'

export interface ImportPreviewRow {
  rowNumber: number
  serviceName: string
  serviceId: string | null
  itemTypeName: string | null
  itemTypeId: string | null
  unit: 'kg' | 'item'
  price: number
  action: 'create' | 'update'
  error?: string
}

export interface ImportPreview {
  rows: ImportPreviewRow[]
  validCount: number
  errorCount: number
}

export interface ImportCommitResult {
  servicesCreated: number
  itemTypesCreated: number
  kgRatesSet: number
  pricesUpserted: number
  failedRows: number
}

interface RawRow {
  service: string
  itemType: string
  unit: string
  price: string
  rowNumber: number
}

function parseCsv(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const serviceCol = header.indexOf('service')
  const itemTypeCol = header.findIndex(h => h === 'item type' || h === 'itemtype')
  const unitCol = header.indexOf('unit')
  const priceCol = header.indexOf('price')

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    rows.push({
      service: serviceCol >= 0 ? cols[serviceCol] ?? '' : '',
      itemType: itemTypeCol >= 0 ? cols[itemTypeCol] ?? '' : '',
      unit: unitCol >= 0 ? cols[unitCol] ?? '' : '',
      price: priceCol >= 0 ? cols[priceCol] ?? '' : '',
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

  const colIndex: { service?: number; itemType?: number; unit?: number; price?: number } = {}
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const val = String(cell.value ?? '').trim().toLowerCase()
    if (val === 'service') colIndex.service = colNumber
    else if (val === 'item type' || val === 'itemtype') colIndex.itemType = colNumber
    else if (val === 'unit') colIndex.unit = colNumber
    else if (val === 'price') colIndex.price = colNumber
  })

  const get = (row: ExcelJS.Row, col?: number) => col ? String(row.getCell(col).value ?? '').trim() : ''

  const rows: RawRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const service = get(row, colIndex.service)
    const itemType = get(row, colIndex.itemType)
    const price = get(row, colIndex.price)
    if (!service && !itemType && !price) return
    rows.push({ service, itemType, unit: get(row, colIndex.unit), price, rowNumber })
  })
  return rows
}

async function parseFile(file: File): Promise<RawRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsv(await file.text())
  }
  return parseXlsx(Buffer.from(await file.arrayBuffer()))
}

async function getCallerContext() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp || emp.role !== 'admin') return null

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('pricing_model')
    .eq('laundry_id', emp.laundry_id)
    .single()

  return {
    supabase,
    laundryId: emp.laundry_id as string,
    pricingModel: (settingsRow?.pricing_model ?? 'per_item') as PricingModel,
  }
}

export async function parsePricingImport(formData: FormData): Promise<ServiceResult<ImportPreview>> {
  const ctx = await getCallerContext()
  if (!ctx) return { success: false, error: 'Admin only.' }
  const { supabase, laundryId, pricingModel } = ctx

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No file uploaded.' }
  }

  let rawRows: RawRow[]
  try {
    rawRows = await parseFile(file)
  } catch {
    return { success: false, error: 'Could not read that file. Make sure it is a valid .xlsx or .csv export.' }
  }

  const [{ data: services }, { data: itemTypes }, { data: existingPrices }, { data: kgRates }] = await Promise.all([
    supabase.from('services').select('id, name').eq('laundry_id', laundryId).is('deleted_at', null),
    supabase.from('item_types').select('id, name').eq('laundry_id', laundryId).is('deleted_at', null),
    supabase.from('item_service_prices').select('item_type_id, service_id, is_active').eq('laundry_id', laundryId),
    supabase.from('services').select('id, kg_rate').eq('laundry_id', laundryId),
  ])

  const serviceByName = new Map((services ?? []).map(s => [s.name.trim().toLowerCase(), s.id as string]))
  const itemTypeByName = new Map((itemTypes ?? []).map(t => [t.name.trim().toLowerCase(), t.id as string]))
  const kgRateById = new Map((kgRates ?? []).map(s => [s.id as string, s.kg_rate as number | null]))
  const hasActivePrice = new Set(
    (existingPrices ?? []).filter(p => p.is_active).map(p => `${p.item_type_id}:${p.service_id}`)
  )

  const rows: ImportPreviewRow[] = rawRows.map(r => {
    const serviceName = r.service.trim()
    const unitRaw = r.unit.trim().toLowerCase()
    const priceNum = parseFloat(r.price)
    const serviceId = serviceName ? serviceByName.get(serviceName.toLowerCase()) ?? null : null

    if (!serviceName) {
      return { rowNumber: r.rowNumber, serviceName: '', serviceId: null, itemTypeName: null, itemTypeId: null, unit: 'item', price: 0, action: 'create', error: 'Missing service name.' }
    }
    if (unitRaw !== 'kg' && unitRaw !== 'item') {
      return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName: null, itemTypeId: null, unit: 'item', price: 0, action: 'create', error: `Unit must be "kg" or "item", got "${r.unit || '(blank)'}".` }
    }
    if (isNaN(priceNum) || priceNum < 0) {
      return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName: null, itemTypeId: null, unit: unitRaw, price: 0, action: 'create', error: `Invalid price "${r.price}".` }
    }

    if (unitRaw === 'kg') {
      if (pricingModel === 'per_item') {
        return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName: null, itemTypeId: null, unit: 'kg', price: priceNum, action: 'create', error: 'This laundry is fully per-item priced — weight-based (kg) rows are not allowed.' }
      }
      const action: 'create' | 'update' = !serviceId || kgRateById.get(serviceId) == null ? 'create' : 'update'
      return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName: null, itemTypeId: null, unit: 'kg', price: priceNum, action }
    }

    const itemTypeName = r.itemType.trim()
    if (!itemTypeName) {
      return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName: null, itemTypeId: null, unit: 'item', price: priceNum, action: 'create', error: 'Item rows must include an Item Type.' }
    }
    if (pricingModel === 'per_kg') {
      return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName, itemTypeId: itemTypeByName.get(itemTypeName.toLowerCase()) ?? null, unit: 'item', price: priceNum, action: 'create', error: 'This laundry is fully weight-priced — item-level rows are not allowed.' }
    }
    const itemTypeId = itemTypeByName.get(itemTypeName.toLowerCase()) ?? null
    const action: 'create' | 'update' = !serviceId || !itemTypeId || !hasActivePrice.has(`${itemTypeId}:${serviceId}`) ? 'create' : 'update'
    return { rowNumber: r.rowNumber, serviceName, serviceId, itemTypeName, itemTypeId, unit: 'item', price: priceNum, action }
  })

  const errorCount = rows.filter(r => r.error).length
  return { success: true, data: { rows, validCount: rows.length - errorCount, errorCount } }
}

export async function commitPricingImport(rows: ImportPreviewRow[]): Promise<ServiceResult<ImportCommitResult>> {
  const ctx = await getCallerContext()
  if (!ctx) return { success: false, error: 'Admin only.' }
  const { supabase, laundryId, pricingModel } = ctx

  const validRows = rows.filter(r => !r.error)
  let servicesCreated = 0
  let itemTypesCreated = 0
  let kgRatesSet = 0
  let pricesUpserted = 0
  let failedRows = 0

  const serviceIdByName = new Map<string, string>()
  const itemTypeIdByName = new Map<string, string>()

  async function resolveServiceId(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase()
    const cached = serviceIdByName.get(key)
    if (cached) return cached
    const res = await createService(name.trim())
    if (!res.success) return null
    serviceIdByName.set(key, res.data.id)
    servicesCreated++
    return res.data.id
  }

  async function resolveItemTypeId(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase()
    const cached = itemTypeIdByName.get(key)
    if (cached) return cached
    const res = await createItemType(name.trim())
    if (!res.success) return null
    itemTypeIdByName.set(key, res.data.id)
    itemTypesCreated++
    return res.data.id
  }

  // Sequential, not parallel — dedup of newly-created services/item types
  // depends on each row seeing the previous rows' creations.
  for (const row of validRows) {
    // Re-check against current pricing_model — it may have changed since preview.
    if (row.unit === 'kg' && pricingModel === 'per_item') { failedRows++; continue }
    if (row.unit === 'item' && pricingModel === 'per_kg') { failedRows++; continue }

    const serviceId = row.serviceId ?? await resolveServiceId(row.serviceName)
    if (!serviceId) { failedRows++; continue }

    if (row.unit === 'kg') {
      const res = await setServicePricing(serviceId, 'per_kg', row.price)
      if (res.success) kgRatesSet++
      else failedRows++
      continue
    }

    const itemTypeId = row.itemTypeId ?? (row.itemTypeName ? await resolveItemTypeId(row.itemTypeName) : null)
    if (!itemTypeId) { failedRows++; continue }
    const res = await upsertPrice(itemTypeId, serviceId, row.price)
    if (res.success) pricesUpserted++
    else failedRows++
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user!.id)
    .single()

  await supabase.from('activity_logs').insert({
    laundry_id: laundryId,
    employee_id: emp?.id ?? null,
    action_type: ACTIVITY_ACTION_TYPES.PRICING_IMPORTED,
    description: `Pricing import: ${servicesCreated} services created, ${itemTypesCreated} item types created, ${kgRatesSet} kg rates set, ${pricesUpserted} item prices set${failedRows > 0 ? `, ${failedRows} rows failed` : ''}`,
  })

  return { success: true, data: { servicesCreated, itemTypesCreated, kgRatesSet, pricesUpserted, failedRows } }
}
