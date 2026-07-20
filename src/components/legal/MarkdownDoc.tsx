import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownDoc({ content }: { content: string }) {
  return (
    <article className="prose prose-neutral max-w-none prose-headings:tracking-heading prose-headings:font-extrabold prose-a:text-brand prose-a:no-underline hover:prose-a:underline prose-strong:text-warm-950 prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  )
}
