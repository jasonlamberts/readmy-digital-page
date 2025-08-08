import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { ArrowLeft, MessageSquarePlus } from "lucide-react"

function useLongPress(onLongPress: () => void, ms = 600) {
  const timeout = useRef<number | null>(null)
  const start = () => {
    clear()
    timeout.current = window.setTimeout(onLongPress, ms)
  }
  const clear = () => {
    if (timeout.current) window.clearTimeout(timeout.current)
    timeout.current = null
  }
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  }
}

type ChapterRow = {
  id: string
  title: string
  slug: string
  description: string | null
  content: string
  order_index: number
}

const VersionReader = () => {
  const { version, slug } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [bookId, setBookId] = useState<string | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [loading, setLoading] = useState(true)

  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [selectedText, setSelectedText] = useState("")

  const current = useMemo(() => chapters.find((c) => c.slug === slug) || chapters[0], [chapters, slug])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // Ensure the book exists by title
        const { data: book, error: be } = await supabase
          .from("books")
          .select("id")
          .eq("title", "The Divine Gene")
          .maybeSingle()
        if (be) throw be
        if (!book?.id) {
          setLoading(false)
          return
        }
        setBookId(book.id)

        // Find version id
        const { data: ver, error: ve } = await supabase
          .from("book_versions")
          .select("id")
          .eq("book_id", book.id)
          .eq("name", version || "Original")
          .maybeSingle()
        if (ve) throw ve
        if (!ver?.id) {
          setLoading(false)
          return
        }
        setVersionId(ver.id)

        const { data: chs, error: ce } = await supabase
          .from("chapters")
          .select("id,title,slug,description,content,order_index")
          .eq("book_id", book.id)
          .eq("version_id", ver.id)
          .order("order_index", { ascending: true })
        if (ce) throw ce
        setChapters((chs as ChapterRow[]) || [])

        // If no slug provided, navigate to first chapter
        if (!slug && chs && chs.length > 0) {
          navigate(`/book/the-divine-gene/${encodeURIComponent(version || "Original")}/${chs[0].slug}`, { replace: true })
        }
      } catch (e: any) {
        toast({ title: "Failed to load", description: e?.message || "Error loading chapters", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, slug])

  const openComment = () => {
    const sel = window.getSelection()?.toString() || ""
    setSelectedText(sel)
    setCommentOpen(true)
  }

  const longPressHandlers = useLongPress(openComment)

  const submitComment = async () => {
    try {
      if (!bookId || !current) return
      const payload = {
        book_id: bookId,
        chapter_id: current.id,
        version_id: versionId,
        content: commentText.trim(),
        author_name: authorName.trim() || null,
        anchor: selectedText ? { selectedText, chapterSlug: current.slug } : null,
      }
      const { error } = await supabase.from("comments").insert(payload as any)
      if (error) throw error
      toast({ title: "Comment saved", description: "Thanks for your feedback!" })
      setCommentText("")
      setAuthorName("")
      setCommentOpen(false)
    } catch (e: any) {
      toast({ title: "Failed to save comment", description: e?.message || "Error", variant: "destructive" })
    }
  }

  const jsonLd = current
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `The Divine Gene: ${current.title}`,
        author: { "@type": "Person", name: "Unknown" },
        description: current.description || undefined,
      }
    : undefined

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`The Divine Gene — ${current?.title || version || "Reader"}`}
        description={current?.description || `Reading ${version} of The Divine Gene`}
        jsonLd={jsonLd as any}
      />

      <div className="container py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft className="mr-2 size-4" /> Home
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">The Divine Gene</h1>
            <span className="text-muted-foreground">• {version}</span>
          </div>
        </header>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : chapters.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No chapters yet</CardTitle>
            </CardHeader>
            <CardContent>
              Import chapters for this version on the Import page.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[260px_1fr]">
            <aside className="md:sticky md:top-6 md:h-[calc(100vh-5rem)] md:overflow-y-auto">
              <nav className="rounded-lg border p-3">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Chapters</h2>
                <ul className="space-y-1">
                  {chapters.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/book/the-divine-gene/${encodeURIComponent(version || "Original")}/${c.slug}`}
                        className={`block rounded px-2 py-1 text-sm hover:bg-accent ${c.slug === current?.slug ? "bg-accent" : ""}`}
                      >
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <section className="relative rounded-lg border">
              <div id="reader-content" className="max-h-[calc(100vh-8rem)] overflow-y-auto p-6" {...longPressHandlers}>
                <article className="reader-article mx-auto max-w-3xl">
                  <h2 className="mb-2 text-3xl font-semibold tracking-tight">{current?.title}</h2>
                  {current?.description && (
                    <p className="mb-6 text-muted-foreground">{current.description}</p>
                  )}
                  {current?.content.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-5">
                      {para}
                    </p>
                  ))}
                </article>
              </div>

              {/* Floating comment button */}
              <div className="pointer-events-none absolute bottom-4 right-4">
                <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="lg" className="pointer-events-auto shadow" onClick={openComment}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" /> Comment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a comment</DialogTitle>
                    </DialogHeader>
                    {selectedText && (
                      <div className="mb-3 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                        Selected: “{selectedText.slice(0, 160)}{selectedText.length > 160 ? "…" : ""}”
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Your name (optional)</label>
                        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Name" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Comment</label>
                        <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Your thoughts…" className="min-h-[120px]" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={submitComment} disabled={!commentText.trim()}>Submit</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

export default VersionReader
