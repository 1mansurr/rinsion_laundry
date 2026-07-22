'use client'

// Desktop: numbered page buttons. Mobile (≤720px): "Load more" button.
// The max-[720px] breakpoint is the single source of truth for the switch.

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: PaginationProps) {
  if (totalPages <= 1 && !hasMore) return null

  const pages = buildPageRange(page, totalPages)

  return (
    <>
      {/* Desktop numbered pagination */}
      <div className="rin-pager max-[720px]:hidden flex items-center justify-center gap-1 py-4">
        <NavBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)} label="Previous">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </NavBtn>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-warm-500 text-ui-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`
                min-w-[36px] h-9 px-2 rounded-12 text-ui font-medium transition-colors
                ${(p as number) === page
                  ? 'bg-brand text-[#FAF8F5]'
                  : 'text-warm-950 hover:bg-warm-100'}
              `}
            >
              {p}
            </button>
          )
        )}

        <NavBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} label="Next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </NavBtn>
      </div>

      {/* Mobile load-more */}
      {hasMore && (
        <div className="rin-loadmore hidden max-[720px]:flex justify-center py-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-ui font-semibold text-brand hover:text-brand-hover disabled:text-warm-500 px-4 py-2"
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}

function NavBtn({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-12 text-warm-800 hover:bg-warm-100 disabled:text-warm-400 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
