import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { MarkdownDoc } from '@/components/legal/MarkdownDoc'

export const metadata: Metadata = {
  title: 'Privacy Policy — Rinsion',
  description: 'How Rinsion collects, uses, and protects data on the Rinsion laundry management platform.',
}

export default async function PrivacyPage() {
  const content = await readFile(
    path.join(process.cwd(), 'docs', 'Rinsion_Privacy_Policy_v4.1.md'),
    'utf-8',
  )
  return <MarkdownDoc content={content} />
}
