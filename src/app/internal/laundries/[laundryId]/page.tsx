import { notFound } from 'next/navigation'
import { getLaundryDetail } from '@/services/platform/getLaundryDetail'
import { LaundryDetailClient } from './LaundryDetailClient'

interface Props {
  params: { laundryId: string }
}

export default async function LaundryDetailPage({ params }: Props) {
  const laundry = await getLaundryDetail(params.laundryId)
  if (!laundry) notFound()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <LaundryDetailClient laundry={laundry} />
    </div>
  )
}
