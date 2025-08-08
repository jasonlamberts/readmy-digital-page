import { useCallback, useMemo, useState } from "react"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function summarize(content: string, max = 160) {
  const text = content.replace(/\s+/g, " ").trim()
  if (!text) return undefined
  if (text.length <= max) return text
  const periodIdx = text.indexOf(". ")
  if (periodIdx > 40 && periodIdx < max) return text.slice(0, periodIdx + 1)
  return text.slice(0, max - 1) + "…"
}

const ImportBook = () => {
  const { toast } = useToast()
  const [bookTitle, setBookTitle] = useState("The Divine Gene")
  const [author, setAuthor] = useState("")

  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterContent, setChapterContent] = useState("")
  const baseSlug = useMemo(() => slugify(chapterTitle) || "chapter", [chapterTitle])
  const summary = useMemo(() => summarize(chapterContent), [chapterContent])
  const canSave = bookTitle.trim() && chapterTitle.trim() && chapterContent.trim()
  const [saving, setSaving] = useState(false)

  const ensureBook = useCallback(async (title: string) => {
    const { data: existing, error: existErr } = await supabase
      .from("books")
      .select("id")
      .eq("title", title.trim())
      .maybeSingle()

    if (existErr && existErr.code !== "PGRST116") throw existErr

    if (existing?.id) {
      // Optionally update author if provided
      if (author.trim()) {
        await supabase.from("books").update({ author: author.trim() }).eq("id", existing.id)
      }
      return existing.id as string
    }

    const { data: inserted, error: insErr } = await supabase
      .from("books")
      .insert({ title: title.trim(), author: author.trim() || null })
      .select("id")
      .single()

    if (insErr) throw insErr
    return inserted!.id as string
  }, [author])

  const nextOrderIndex = useCallback(async (bookId: string) => {
    const { data, error } = await supabase
      .from("chapters")
      .select("order_index")
      .eq("book_id", bookId)
      .order("order_index", { ascending: false })
      .limit(1)
    if (error) throw error
    const max = data && data.length > 0 ? data[0].order_index || 0 : 0
    return (max as number) + 1
  }, [])

  const uniqueSlug = useCallback(async (bookId: string, slug: string) => {
    // Try the base slug; if taken, append -2, -3, ... up to -10 then timestamp fallback
    let candidate = slug
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase
        .from("chapters")
        .select("id")
        .eq("book_id", bookId)
        .eq("slug", candidate)
        .maybeSingle()
      if (!data) return candidate
      candidate = `${slug}-${i + 2}`
    }
    return `${slug}-${Date.now().toString(36).slice(-4)}`
  }, [])

  const handleSave = useCallback(async () => {
    if (!canSave) return
    try {
      setSaving(true)
      const bookId = await ensureBook(bookTitle)
      const order = await nextOrderIndex(bookId)
      const finalSlug = await uniqueSlug(bookId, baseSlug)

      const { error: chErr } = await supabase.from("chapters").insert({
        book_id: bookId,
        slug: finalSlug,
        title: chapterTitle.trim(),
        description: summary || null,
        content: chapterContent,
        order_index: order,
      })
      if (chErr) throw chErr

      toast({
        title: "Chapter saved",
        description: "We analyzed the content and generated a summary for the TOC.",
      })
      setChapterTitle("")
      setChapterContent("")
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [canSave, ensureBook, bookTitle, nextOrderIndex, uniqueSlug, baseSlug, chapterTitle, chapterContent, summary, toast])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Import Chapter",
    description: "Paste a chapter; we auto-generate its summary and save to Supabase.",
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Import Chapter — Save to Supabase"
        description="Paste a single chapter; we'll generate a summary for the table of contents."
        jsonLd={jsonLd}
      />
      <div className="container py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Import Chapter</h1>
          <p className="text-muted-foreground">
            Add one chapter at a time. We create a slug and summary automatically for your table of contents.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Book & Chapter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Book Title</label>
                  <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="The Divine Gene" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Author (optional)</label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your Name" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Chapter Title</label>
                <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Chapter X: Title" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Chapter Content</label>
                <Textarea
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  placeholder={"Paste the chapter content here."}
                  className="min-h-[260px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? "Saving…" : "Save Chapter"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Slug</div>
                <div className="font-mono text-sm">{baseSlug}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Summary (for TOC)</div>
                {summary ? (
                  <div className="text-sm">{summary}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Type content to generate a summary…</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="mt-6 text-sm text-muted-foreground">
          Tip: Keep importing chapters; order is assigned automatically. We can switch the reader to load from Supabase when you're ready.
        </aside>
      </div>
    </main>
  )
}

export default ImportBook
