import { Link } from 'react-router-dom'
import { book } from '@/content/book'
import { cn } from '@/lib/utils'

export const TOC = ({ current }: { current?: string }) => {
  return (
    <nav aria-label="Table of contents" className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Chapters</h2>
      <ul className="space-y-1">
        {book.chapters.map((ch) => {
          const active = ch.slug === current
          return (
            <li key={ch.slug}>
              <Link
                to={`/read/${ch.slug}`}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {ch.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
