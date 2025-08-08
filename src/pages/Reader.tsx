import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { book } from '@/content/book'
import { TOC } from '@/components/TOC'
import { ReaderControls } from '@/components/ReaderControls'
import { SEO } from '@/components/SEO'
import { ProgressBar } from '@/components/ProgressBar'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const Reader = () => {
  const { slug } = useParams()
  const current = useMemo(() => book.chapters.find(c => c.slug === slug) ?? book.chapters[0], [slug])
  const [fontSize, setFontSize] = useState<number>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 20 : 18
  )

  const inc = () => setFontSize((v) => Math.min(28, v + 1))
  const dec = () => setFontSize((v) => Math.max(14, v - 1))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${book.title}: ${current.title}`,
    author: { '@type': 'Person', name: book.author },
    description: current.description ?? book.description,
  }

  // Persist last read location (per device)
  useEffect(() => {
    try {
      localStorage.setItem('reader:last', JSON.stringify({ path: `/read/${current.slug}`, slug: current.slug, ts: Date.now() }))
    } catch {}
  }, [current.slug])

  // Restore and persist scroll position for this chapter
  useEffect(() => {
    const el = document.getElementById('reader-content') as HTMLElement | null
    if (!el) return
    const key = `reader:scroll:${window.location.pathname}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const top = parseInt(saved, 10)
      if (!Number.isNaN(top)) {
        el.scrollTop = top
      }
    }
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        try { localStorage.setItem(key, String(el.scrollTop)) } catch {}
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [current.slug])

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Read ${book.title} — ${current.title}`}
        description={current.description ?? book.description}
        jsonLd={jsonLd}
      />

      <div className="container py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
            <Link to={`/read/${book.chapters[0].slug}`}>
              <ArrowLeft className="mr-2 size-4" /> Home
            </Link>
            </Button>
            <h1 className="text-xl font-semibold">
              <Link to={`/read/${book.chapters[0].slug}`} className="hover:underline">
                {book.title}
              </Link>
            </h1>
          </div>
          <ReaderControls fontSize={fontSize} onFontDec={dec} onFontInc={inc} />
        </header>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="md:sticky md:top-6 md:h-[calc(100vh-5rem)] md:overflow-y-auto">
            <TOC current={current.slug} />
          </aside>

          <section className="rounded-lg border">
            <ProgressBar />
            <div id="reader-content" className="max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
              <article className="reader-article mx-auto max-w-3xl">
                <h2 className="mb-2 text-3xl font-semibold tracking-tight">{current.title}</h2>
                {current.content.split('\n\n').map((para, i) => (
                  <p key={i} className="mb-5" style={{ fontSize }}>
                    {para}
                  </p>
                ))}
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Reader
