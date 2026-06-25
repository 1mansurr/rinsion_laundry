import { getMyProfile } from '@/services/employees/getMyProfile'
import { getCustomers } from '@/services/customers'
import Link from 'next/link'

export default async function CustomersPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const customers = await getCustomers(profile.laundryId)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <Link
          href="/customers/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Customer
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {customers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">No customers yet.</p>
            <Link href="/customers/new" className="text-sm text-gray-900 underline mt-2 inline-block">
              Add your first customer
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Last Visit</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">
                    {c.lastVisitDate ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/customers/${c.id}`} className="text-xs text-gray-400 hover:text-gray-900">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
