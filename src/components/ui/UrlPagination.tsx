'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Pagination } from './Pagination'

interface UrlPaginationProps {
  page: number
  totalPages: number
  pathname: string
  searchParams: Record<string, string>
}

export function UrlPagination({ page, totalPages, pathname, searchParams }: UrlPaginationProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function navigate(newPage: number) {
    const params = new URLSearchParams(searchParams)
    if (newPage <= 1) params.delete('page')
    else params.set('page', String(newPage))
    const qs = params.toString()
    startTransition(() => router.push(`${pathname}${qs ? '?' + qs : ''}`))
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={navigate}
      hasMore={page < totalPages}
      onLoadMore={() => navigate(page + 1)}
    />
  )
}
