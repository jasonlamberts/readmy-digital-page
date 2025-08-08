import { useCallback, useMemo, useState } from "react"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

// Utility to create URL-friendly slugs
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

// Extract a short description from content
function summarize(content: string, max = 160) {
  const text = content.replace(/\s+/g, " ").trim()
  if (!text) return undefined
  if (text.length <= max) return text
  const periodIdx = text.indexOf(". ")
  if (periodIdx > 40 && periodIdx < max) return text.slice(0, periodIdx + 1)
  return text.slice(0, max - 1) + "…"
}

// Parse manuscript into chapters using common patterns
function parseManuscript(text: string) {
  const lines = text.split(/\r?\n/)
  type Section = { title: string; content: string }
  const sections: Section[] = []

  const headerPatterns = [
    { type: "md", regex: /^##\s+(.+)$/i },
    { type: "chapter", regex: /^chapter\s+(\d+)(?:[:.\-\s]+(.*))?$/i },
    { type: "special", regex: /^(introduction|prologue|epilogue|preface|afterword)\s*$/i },
  ]

  let currentTitle: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (currentTitle) {
      const content = buffer.join("\n").trim()
      sections.push({ title: currentTitle, content })
    }
    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    let matched = false
    for (const p of headerPatterns) {
      const m = line.match(p.regex as RegExp)
      if (m) {
        if (currentTitle !== null) flush()
        if (p.type === "md") {
          currentTitle = m[1].trim()
        } else if (p.type === "chapter") {
          const n = m[1]
          const t = (m[2] || "").trim()
          currentTitle = t ? `Chapter ${n}: ${t}` : `Chapter ${n}`
        } else {
          currentTitle = line
            .toLowerCase()
            .replace(/(^|\s)\S/g, (s) => s.toUpperCase())
        }
        matched = true
        break
      }
    }
    if (!matched) buffer.push(rawLine)
  }
  if (currentTitle !== null) flush()

  // If no headers found, treat entire text as one chapter
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: "Introduction", content: text.trim() })
  }

  // Generate unique slugs
  const seen = new Map<string, number>()
  const chapters = sections.map((s) => {
    let base = slugify(s.title)
    if (!base) base = "chapter"
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    const unique = count > 1 ? `${base}-${count}` : base
    return {
      slug: unique,
      title: s.title,
      description: summarize(s.content),
      content: s.content,
    }
  })

  return chapters
}

const ImportBook = () => {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [coverAlt, setCoverAlt] = useState("")
  const [raw, setRaw] = useState("")
  const [saving, setSaving] = useState(false)

  const chapters = useMemo(() => parseManuscript(raw), [raw])

  const canSave = title.trim() && author.trim() && chapters.length > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return
    try {
      setSaving(true)

      // Check if a book with the same title exists
      const { data: existing, error: existErr } = await supabase
        .from("books")
        .select("id")
        .eq("title", title.trim())
        .maybeSingle()

      if (existErr && existErr.code !== "PGRST116") {
        throw existErr
      }

      let bookId: string | undefined = existing?.id

      if (bookId) {
        const { error: updErr } = await supabase
          .from("books")
          .update({
            subtitle: subtitle || null,
            author: author.trim(),
            description: description || null,
            cover_alt: coverAlt || null,
          })
          .eq("id", bookId)
        if (updErr) throw updErr

        // Clear old chapters
        const { error: delErr } = await supabase
          .from("chapters")
          .delete()
          .eq("book_id", bookId)
        if (delErr) throw delErr
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("books")
          .insert({
            title: title.trim(),
            subtitle: subtitle || null,
            author: author.trim(),
            description: description || null,
            cover_alt: coverAlt || null,
          })
          .select("id")
          .single()
        if (insErr) throw insErr
        bookId = ins!.id
      }

      // Insert chapters in order
      const { error: chErr } = await supabase.from("chapters").insert(
        chapters.map((c, idx) => ({
          book_id: bookId!,
          slug: c.slug,
          title: c.title,
          description: c.description || null,
          content: c.content,
          order_index: idx + 1,
        }))
      )
      if (chErr) throw chErr

      toast({
        title: "Book saved to Supabase",
        description: "Your chapters have been imported successfully.",
      })
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [canSave, title, subtitle, author, description, coverAlt, chapters, toast])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Import Book",
    description: "Paste your manuscript; chapters are auto-detected and saved to Supabase.",
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Import Book — Paste & Save to Supabase"
        description="Paste your manuscript; we'll detect chapters and save to Supabase."
        jsonLd={jsonLd}
      />
      <div className="container py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Import Book</h1>
          <p className="text-muted-foreground">
            Paste your full text below. We detect chapters like "Chapter 1: Title", "Introduction", or Markdown headings (## Title).
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Book Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Divine Gene" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Subtitle</label>
                  <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A Journey Through..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Author</label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your Name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Cover Alt Text</label>
                  <Input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Abstract light over open book" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Short Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A concise overview of your book." />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Manuscript</label>
                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={"Paste your entire manuscript here. Use headings like 'Chapter 1: Title' or '## Title'."}
                  className="min-h-[280px]"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? "Saving…" : "Save to Supabase"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview ({chapters.length} chapter{chapters.length === 1 ? "" : "s"})</CardTitle>
            </CardHeader>
            <CardContent>
              {chapters.length === 0 ? (
                <p className="text-muted-foreground">Chapters will appear here after you paste your text.</p>
              ) : (
                <ol className="space-y-4">
                  {chapters.map((c, i) => (
                    <li key={c.slug} className="rounded-md border p-3">
                      <div className="mb-1 text-sm text-muted-foreground">{i + 1}. {c.slug}</div>
                      <div className="font-medium">{c.title}</div>
                      {c.description && (
                        <div className="text-sm text-muted-foreground">{c.description}</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="mt-6 text-sm text-muted-foreground">
          Note: Reading pages currently use the built-in sample book. I can switch them to load from Supabase after your import—just say the word.
        </aside>
      </div>
    </main>
  )
}

export default ImportBook
