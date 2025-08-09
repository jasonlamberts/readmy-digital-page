import hero from '@/assets/hero-divine.jpg'
import archangel from '@/assets/archangel-michael.jpg'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SEO } from '@/components/SEO'
import { book } from '@/content/book'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'

const Index = () => {
  const [bookId, setBookId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Array<{ id: string; name: string; firstSlug: string | null; chapterCount: number; summary: string | null }>>([])
  const [autoSummary, setAutoSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [versionsOpen, setVersionsOpen] = useState(false)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
  }

  // Auto-redirect to last read location if available
  

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

        // Build summaries per version
        const summaryByVersion: Record<string, string | null> = {}
        vers.forEach(v => {
          const vChaps = chapters.filter(c => c.version_id === v.id)
          const joinedSum = vChaps.map(c => c.description || c.content?.split('\n\n')[0] || '').join(' ')
          summaryByVersion[v.id] = summarize(joinedSum)
        })

        setVersions(vers.map(v => ({
          id: v.id,
          name: v.name,
          firstSlug: byVersion[v.id]?.firstSlug || null,
          chapterCount: byVersion[v.id]?.count || 0,
          summary: summaryByVersion[v.id] || null,
        })))

        // Auto-summary from the first version's chapters
        const firstVersionId = vers[0].id
        const firstChapters = chapters.filter(c => c.version_id === firstVersionId)
        const joined = firstChapters.map(c => c.description || c.content?.split('\n\n')[0] || '').join(' ')
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
        <div className="container relative min-h-screen py-20 flex items-center justify-center">
          <div className="glass-card relative overflow-hidden rounded-2xl p-8 max-w-2xl">
            <div
              className="absolute inset-0 bg-center bg-cover opacity-40 pointer-events-none"
              style={{ backgroundImage: `url(${archangel})` }}
              aria-hidden
            />
            <div className="relative z-10">
              <h1 className="mb-4 text-4xl font-bold leading-tight">
                The Divine Gene
              </h1>
              <p className="mb-6 text-lg text-muted-foreground">
                Authored by Jason Lamberts
              </p>
                <div className="flex flex-col items-center gap-4">
                  <Button variant="hero" size="xl" onClick={() => setVersionsOpen(true)}>
                    Start Reading
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/import">Import Chapter</Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/import-full">Import Full Book</Link>
                  </Button>
                </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Version</DialogTitle>
            <DialogDescription>
              Choose a version to start reading. Each includes a quick summary.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {versions.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{v.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">{v.chapterCount} ch.</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {v.summary || 'Summary will appear once chapters are available.'}
                  </p>
                  <Button asChild size="sm" disabled={!v.firstSlug}>
                    <Link to={v.firstSlug ? `/book/the-divine-gene/${encodeURIComponent(v.name)}/${v.firstSlug}` : '#'}>
                      Read this version
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground">No versions available yet. Try importing one.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default Index;

