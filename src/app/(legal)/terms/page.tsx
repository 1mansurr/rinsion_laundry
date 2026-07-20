import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { MarkdownDoc } from '@/components/legal/MarkdownDoc'

export const metadata: Metadata = {
  title: 'Terms of Service — Rinsion',
  description: 'The terms of service governing use of the Rinsion laundry management platform.',
}

export default async function TermsPage() {
  const content = await readFile(
    path.join(process.cwd(), 'docs', 'Rinsion_Terms_of_Service_v4.1.md'),
    'utf-8',
  )
  return <MarkdownDoc content={content} />
}
