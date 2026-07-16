import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getExportData } from '@/services/settings/getExportData'

export const runtime = 'nodejs'

function addSheet<T extends Record<string, unknown>>(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: { header: string; key: keyof T & string; width?: number }[],
  rows: T[],
) {
  const sheet = workbook.addWorksheet(name)
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) sheet.addRow(row)
}

export async function GET() {
  const profile = await getMyProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await getExportData(profile.laundryId)

  const workbook = new ExcelJS.Workbook()

  addSheet(workbook, 'Customers', [
    { header: 'Customer Code', key: 'customerCode' },
    { header: 'First Name', key: 'firstName' },
    { header: 'Last Name', key: 'lastName' },
    { header: 'Phone', key: 'phone' },
    { header: 'First Visit', key: 'firstVisitDate' },
    { header: 'Last Visit', key: 'lastVisitDate' },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ], data.customers)

  addSheet(workbook, 'Employees', [
    { header: 'First Name', key: 'firstName' },
    { header: 'Last Name', key: 'lastName' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Role', key: 'role' },
    { header: 'Active', key: 'isActive' },
    { header: 'Branch', key: 'branchName' },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ], data.employees)

  addSheet(workbook, 'Branches', [
    { header: 'Branch Code', key: 'branchCode' },
    { header: 'Name', key: 'name' },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ], data.branches)

  addSheet(workbook, 'Orders', [
    { header: 'Order Number', key: 'orderNumber' },
    { header: 'Pickup Code', key: 'pickupCode' },
    { header: 'Branch', key: 'branchName' },
    { header: 'Customer', key: 'customerName' },
    { header: 'Customer Phone', key: 'customerPhone' },
    { header: 'Status', key: 'status' },
    { header: 'Priority', key: 'priority' },
    { header: 'Pickup Date', key: 'pickupDate' },
    { header: 'Subtotal', key: 'subtotal' },
    { header: 'Total', key: 'total' },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ], data.orders)

  addSheet(workbook, 'Order Items', [
    { header: 'Order Number', key: 'orderNumber' },
    { header: 'Item Type', key: 'itemTypeName' },
    { header: 'Service', key: 'serviceName' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Unit Price', key: 'unitPrice' },
    { header: 'Total Price', key: 'totalPrice' },
  ], data.orderItems)

  addSheet(workbook, 'Payments', [
    { header: 'Order Number', key: 'orderNumber' },
    { header: 'Amount', key: 'amount' },
    { header: 'Method', key: 'paymentMethod' },
    { header: 'Recorded By', key: 'recordedBy' },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ], data.payments)

  addSheet(workbook, 'Item Types', [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Active', key: 'isActive' },
  ], data.itemTypes)

  addSheet(workbook, 'Services', [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Active', key: 'isActive' },
    { header: 'Pricing Mode', key: 'pricingMode' },
    { header: 'Min Kg Rate', key: 'minKgRate' },
    { header: 'Max Kg Rate', key: 'maxKgRate' },
    { header: 'Notes', key: 'notes', width: 40 },
  ], data.services)

  const supabase = createClient()
  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.id,
    action_type: 'DATA_EXPORTED',
    description: `${profile.firstName} ${profile.lastName} exported all laundry data`,
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const dateStamp = new Date().toISOString().split('T')[0]

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rinsion-data-export-${dateStamp}.xlsx"`,
    },
  })
}
