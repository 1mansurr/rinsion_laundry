import { notFound, redirect } from 'next/navigation'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { getOrderInvoiceData } from '@/services/orders/getOrderInvoiceData'
import { formatCurrency } from '@/utils/formatCurrency'
import { Wordmark } from '@/components/ui/Wordmark'
import { RequestPickupSection } from './RequestPickupSection'
import { PayNowSection } from './PayNowSection'

export default async function InvoicePage({ params }: { params: { orderId: string } }) {
  const profile = await getMyCustomerProfile()
  if (!profile) redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/orders/${params.orderId}/invoice`)}`)

  const invoice = await getOrderInvoiceData(params.orderId)
  if (!invoice) notFound()

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 print:bg-white">
      <div className="w-full max-w-lg mx-auto bg-white border border-warm-300 rounded-18 p-6 print:border-0 print:shadow-none space-y-6">
        <div className="flex items-center justify-between">
          <Wordmark size="sm" />
          <span className="text-caption text-warm-500">{invoice.orderNumber}</span>
        </div>

        <div>
          <h1 className="text-h1 font-semibold text-warm-950">{invoice.laundryName}</h1>
          <p className="text-caption text-warm-500">
            {new Date(invoice.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-ui">
          <div>
            <p className="text-caption text-warm-500">Customer</p>
            <p className="text-warm-950 font-medium">{invoice.customerName}</p>
            <p className="text-caption text-warm-500">{invoice.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-caption text-warm-500">Status</p>
            <p className="text-warm-950 font-medium">
              {invoice.status === 'draft' ? 'Awaiting pickup approval' : invoice.status}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-ui">
            <thead>
              <tr className="text-caption text-warm-500 border-b border-warm-200">
                <th className="text-left font-medium py-2">Item</th>
                <th className="text-right font-medium py-2">Qty</th>
                <th className="text-right font-medium py-2">Unit</th>
                <th className="text-right font-medium py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id} className="border-b border-warm-100">
                  <td className="py-2 text-warm-950">{item.itemTypeName} · {item.serviceName}</td>
                  <td className="py-2 text-right tnum text-warm-950">
                    {item.quantity}{item.pricingMode === 'per_kg' ? ' kg' : ''}
                  </td>
                  <td className="py-2 text-right tnum text-warm-950">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right tnum text-warm-950">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 text-ui">
          <div className="flex justify-between text-warm-600">
            <span>Subtotal</span>
            <span className="tnum">{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between text-warm-600">
              <span>Tax</span>
              <span className="tnum">{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-warm-950 font-semibold text-[16px] pt-1">
            <span>Total (estimated)</span>
            <span className="tnum">{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-warm-600">
              <span>Paid</span>
              <span className="tnum">{formatCurrency(invoice.amountPaid)}</span>
            </div>
          )}
        </div>

        <p className="text-caption text-warm-500">
          Prices shown are estimates — the laundry confirms the final price once your items are received.
        </p>

        {invoice.status !== 'draft' && invoice.balanceDue > 0 && (
          <PayNowSection orderId={invoice.orderId} balanceDue={invoice.balanceDue} defaultPhone={invoice.customerPhone} />
        )}

        {invoice.status === 'draft' && (
          <RequestPickupSection orderId={invoice.orderId} initialLocation={invoice.location} />
        )}
      </div>
    </main>
  )
}
