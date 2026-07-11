import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { getPricingMatrix } from '@/services/pricing/getPricingMatrix'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [itemTypes, services, prices] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
  ])

  const activeItemTypes = itemTypes.filter(t => t.isActive)
  const activeServices = services.filter(s => s.isActive)

  const workbook = new ExcelJS.Workbook()

  const sheet = workbook.addWorksheet('Pricing')
  sheet.columns = [
    { header: 'Service', key: 'service', width: 24 },
    { header: 'Item Type', key: 'itemType', width: 24 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Price', key: 'price', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const svc of activeServices) {
    if (svc.pricingMode === 'per_kg') {
      sheet.addRow({ service: svc.name, itemType: '', unit: 'kg', price: svc.kgRate ?? '' })
      // Exceptions already priced per-item for this service (mixed mode)
      for (const item of activeItemTypes) {
        const cell = prices.find(p => p.itemTypeId === item.id && p.serviceId === svc.id && p.isActive)
        if (cell) sheet.addRow({ service: svc.name, itemType: item.name, unit: 'item', price: cell.price })
      }
    } else {
      for (const item of activeItemTypes) {
        const cell = prices.find(p => p.itemTypeId === item.id && p.serviceId === svc.id && p.isActive)
        sheet.addRow({ service: svc.name, itemType: item.name, unit: 'item', price: cell?.price ?? '' })
      }
    }
  }

  if (activeServices.length === 0) {
    sheet.addRow({ service: 'Washing', itemType: '', unit: 'kg', price: '' })
    sheet.addRow({ service: 'Washing', itemType: 'Suit', unit: 'item', price: '' })
    sheet.addRow({ service: 'Ironing', itemType: 'Shirt', unit: 'item', price: '' })
  }

  const readme = workbook.addWorksheet('Instructions')
  readme.columns = [{ key: 'text', width: 100 }]
  ;[
    'How to fill in the Pricing sheet:',
    '',
    '- One row per (Service, Item Type) combination.',
    '- Unit is either "kg" or "item".',
    '- A "kg" row prices that service by total weight — leave Item Type blank.',
    '- An "item" row prices that specific item type per-piece under that service.',
    '- If a service is priced by weight except for a few item types, use one "kg"',
    '  row for the service plus one "item" row per exception item type.',
    '- Price is a plain number, no currency symbol.',
    '- Leave Price blank for a combination you don\'t offer yet — blank rows are skipped.',
    '',
    'Uploading this file will only create or update the rows you fill in — anything',
    'already priced that you leave out of the file is left untouched.',
  ].forEach(line => readme.addRow({ text: line }))

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pricing-template.xlsx"',
    },
  })
}
