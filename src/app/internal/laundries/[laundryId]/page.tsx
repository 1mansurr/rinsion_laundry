import { notFound } from 'next/navigation'
import { getLaundryDetail } from '@/services/platform/getLaundryDetail'
import { LaundryDetailClient } from './LaundryDetailClient'

interface Props {
  params: { laundryId: string }
}

export default async function LaundryDetailPage({ params }: Props) {
  const laundry = await getLaundryDetail(params.laundryId)
  if (!laundry) notFound()

  return <LaundryDetailClient laundry={laundry} />
}
