import hero from '@/assets/hero-divine.jpg'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SEO } from '@/components/SEO'
import { book } from '@/content/book'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'

const Index = () => {
  const [bookId, setBookId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Array<{ id: string; name: string; firstSlug: string | null; chapterCount: number }>>([])
  const [autoSummary, setAutoSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
  }

  function summarize(text: string, max = 220) {
    const t = text.replace(/\s+/g, ' ').trim()
    if (!t) return null
    if (t.length <= max) return t
    const periodIdx = t.indexOf('. ')
    if (periodIdx > 40 && periodIdx < max) return t.slice(0, periodIdx + 1)
    return t.slice(0, max - 1) + '…'
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: b } = await supabase
          .from('books')
          .select('id')
          .eq('title', 'The Divine Gene')
          .maybeSingle()
        if (!b?.id) return
        setBookId(b.id)

        const { data: vers } = await supabase
          .from('book_versions')
          .select('id,name')
          .eq('book_id', b.id)
          .order('created_at', { ascending: true })
        if (!vers || vers.length === 0) return

        const versionIds = vers.map(v => v.id)
        const { data: chs } = await supabase
          .from('chapters')
          .select('id,slug,order_index,version_id,description,content')
          .eq('book_id', b.id)
          .in('version_id', versionIds)
          .order('order_index', { ascending: true })

        const byVersion: Record<string, { firstSlug: string | null; count: number }> = {}
        vers.forEach(v => (byVersion[v.id] = { firstSlug: null, count: 0 }))
        const chapters = chs || []
        chapters.forEach(c => {
          const v = byVersion[c.version_id as string]
          if (!v) return
          v.count += 1
          if (!v.firstSlug) v.firstSlug = c.slug
        })
        setVersions(vers.map(v => ({ id: v.id, name: v.name, firstSlug: byVersion[v.id]?.firstSlug || null, chapterCount: byVersion[v.id]?.count || 0 })))

        // Auto-summary from the first version's chapters
        const firstVersionId = vers[0].id
        const firstChapters = chapters.filter(c => c.version_id === firstVersionId)
        const joined = firstChapters.map(c => c.description || c.content?.split('\
\
')[0] || '').join(' ')
        setAutoSummary(summarize(joined))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const primaryReadHref = versions.length > 0 && versions[0].firstSlug
    ? `/book/the-divine-gene/${encodeURIComponent(versions[0].name)}/${versions[0].firstSlug}`
    : `/read/${book.chapters[0].slug}`

  return (
    <main>
      <SEO
        title={"The Divine Gene — Read Online"}
        description={autoSummary ?? book.description}
        image={hero}
        jsonLd={jsonLd}
      />
      <section className="relative overflow-hidden">
        <div className="hero-gradient absolute inset-0" aria-hidden />
        <div className="container relative grid min-h-[70vh] gap-8 py-16 md:grid-cols-2">
          <div className="flex items-center">
            <div className="glass-card rounded-2xl p-8">
              <h1 className="mb-4 text-4xl font-bold leading-tight">
                The Divine Gene
              </h1>
              <p className="mb-6 text-lg text-muted-foreground">
                {autoSummary ?? 'Import Version 1 to generate a summary shown here.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="hero" size="xl">
                  <Link to={primaryReadHref}>Start Reading</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to={`/read/${book.chapters[0].slug}`}>Table of Contents</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/import">Import Chapter</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/import-full">Import Full Book</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <img
              src={hero}
              alt="Ethereal godlike light and celestial clouds illustration for The Divine Gene"
              className="rounded-xl border shadow-2xl"
              loading="eager"
              width={800}
              height={450}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

export default Index;

