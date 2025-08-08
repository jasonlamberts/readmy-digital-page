import { useEffect, useMemo, useState } from 'react'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import hero from '@/assets/hero-divine.jpg'
import { Link } from 'react-router-dom'

interface VersionInfo {
  id: string
  name: string
  firstSlug: string | null
  chapterCount: number
  summary: string | null
}

function summarize(text: string, max = 200) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (t.length <= max) return t
  const periodIdx = t.indexOf('. ')
  if (periodIdx > 40 && periodIdx < max) return t.slice(0, periodIdx + 1)
  return t.slice(0, max - 1) + '…'
}

export default function Versions() {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: b } = await supabase
          .from('books')
          .select('id, title, description, author')
          .eq('title', 'The Divine Gene')
          .maybeSingle()
        if (!b?.id) return

        const { data: vers } = await supabase
          .from('book_versions')
          .select('id,name,description,created_at')
          .eq('book_id', b.id)
          .order('created_at', { ascending: true })
        if (!vers || vers.length === 0) return

        const versionIds = vers.map(v => v.id)
        const { data: chs } = await supabase
          .from('chapters')
          .select('slug,order_index,version_id,description,content')
          .eq('book_id', b.id)
          .in('version_id', versionIds)
          .order('order_index', { ascending: true })

        const byVersion: Record<string, VersionInfo> = {}
        vers.forEach(v => {
          byVersion[v.id] = {
            id: v.id,
            name: v.name,
            firstSlug: null,
            chapterCount: 0,
            summary: null,
          }
        })

        const chapters = chs || []
        chapters.forEach(c => {
          const v = byVersion[c.version_id as string]
          if (!v) return
          v.chapterCount += 1
          if (!v.firstSlug) v.firstSlug = c.slug
        })

        // Build summaries per version from descriptions or first paragraphs
        const summaryByVersion: Record<string, string> = {}
        vers.forEach(v => {
          const vChaps = chapters.filter(c => c.version_id === v.id)
          const joined = vChaps
            .map(c => c.description || c.content?.split('\n\n')[0] || '')
            .join(' ')
          summaryByVersion[v.id] = summarize(joined) || null
        })

        setVersions(
          vers.map(v => ({
            ...byVersion[v.id],
            summary: summaryByVersion[v.id] || null,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The Divine Gene Versions',
    itemListElement: versions.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: v.firstSlug ? `${location.origin}/book/the-divine-gene/${encodeURIComponent(v.name)}/${v.firstSlug}` : undefined,
      name: v.name,
    })),
  }), [versions])

  return (
    <main>
      <SEO
        title={"The Divine Gene Versions"}
        description={"Choose a version of The Divine Gene to read, with quick summaries."}
        image={hero}
        jsonLd={jsonLd}
      />

      <section className="container py-10">
        <h1 className="mb-6 text-3xl font-bold">Choose a Version</h1>
        <p className="mb-8 text-muted-foreground max-w-2xl">
          Pick a version below to see its chapters. Each card includes a quick summary to help you choose.
        </p>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading versions…</div>
        )}

        {!loading && versions.length === 0 && (
          <div className="text-sm text-muted-foreground">No versions found. Try importing a version first.</div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((v) => (
            <Card key={v.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{v.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">{v.chapterCount} ch.</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground line-clamp-5">
                  {v.summary || 'Summary will appear once chapters are available.'}
                </p>
                <div>
                  <Button
                    asChild
                    size="sm"
                    variant={v.firstSlug ? 'default' : 'secondary'}
                    disabled={!v.firstSlug}
                  >
                    <Link to={v.firstSlug ? `/book/the-divine-gene/${encodeURIComponent(v.name)}/${v.firstSlug}` : '#'}>
                      {v.firstSlug ? 'Read this version' : 'No chapters yet'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
