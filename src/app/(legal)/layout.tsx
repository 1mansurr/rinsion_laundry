import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-warm-300">
        <div className="max-w-[760px] mx-auto px-5 py-5">
          <Link href="/" aria-label="Rinsion home">
            <Wordmark size="md" />
          </Link>
        </div>
      </header>
      <main className="max-w-[760px] mx-auto px-5 py-10 sm:py-14">{children}</main>
    </div>
  )
}
