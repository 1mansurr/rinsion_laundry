export function formatTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hrs = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// For "ready since" on dashboard rows: show time-of-day if today, else relative
export function formatReadySince(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)

  if (days === 0) {
    return date.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
