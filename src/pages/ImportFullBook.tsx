import { useCallback, useMemo, useState } from "react"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

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

function splitIntoChapters(manuscript: string) {
  const lines = manuscript.split(/\r?\n/)
  const chapters: Array<{ title: string; content: string }> = []
  let currentTitle: string | null = null
  let buffer: string[] = []

  const commit = () => {
    if (currentTitle !== null) {
      const content = buffer.join("\n").trim()
      chapters.push({ title: currentTitle || "Chapter", content })
    } else if (buffer.join("").trim()) {
      chapters.push({ title: "Chapter 1", content: buffer.join("\n").trim() })
    }
    buffer = []
  }

  const headerRegexes = [
    /^(chapter|ch\.)\s+([0-9ivxlcdm]+)\b[:.\-–—]?\s*(.*)$/i,
    /^(introduction|prologue|epilogue|preface|foreword)\b[:.\-–—]?\s*(.*)$/i,
    /^#{1,3}\s+(.+)$/,
    /^[A-Z][A-Z0-9\s,'\-]{3,}$/,
  ]

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) { buffer.push(raw); continue }

    const headerMatch = headerRegexes.find((rx) => rx.test(line))
    if (headerMatch) {
      // commit previous
      commit()
      // extract title
      let title = line.replace(/^#{1,3}\s+/, "")
      const m1 = /^(chapter|ch\.)\s+([0-9ivxlcdm]+)\b[:.\-–—]?\s*(.*)$/i.exec(line)
      if (m1) {
        const num = m1[2]
        const rest = (m1[3] || "").trim()
        title = rest ? `Chapter ${num}: ${rest}` : `Chapter ${num}`
      } else {
        const m2 = /^(introduction|prologue|epilogue|preface|foreword)\b[:.\-–—]?\s*(.*)$/i.exec(line)
        if (m2) {
          const rest = (m2[2] || "").trim()
          title = rest ? `${m2[1][0].toUpperCase()}${m2[1].slice(1).toLowerCase()}: ${rest}` : `${m2[1][0].toUpperCase()}${m2[1].slice(1).toLowerCase()}`
        }
      }
      currentTitle = title
      continue
    }

    buffer.push(raw)
  }
  // commit last
  commit()

  // Remove empty-content chapters
  return chapters.filter((c) => c.content && c.content.trim().length > 0)
}

const ImportFullBook = () => {
  const { toast } = useToast()
  const [bookTitle, setBookTitle] = useState("The Divine Gene")
  const [author, setAuthor] = useState("")
  const [versionNumber, setVersionNumber] = useState<string>("1")
  const [manuscript, setManuscript] = useState("")
  const [saving, setSaving] = useState(false)

  const detected = useMemo(() => splitIntoChapters(manuscript), [manuscript])
  const preview = useMemo(
    () =>
      detected.map((c) => ({
        title: c.title,
        description: summarize(c.content) || undefined,
      })),
    [detected]
  )

  const ensureBook = useCallback(async (title: string) => {
    const { data: existing, error: existErr } = await supabase
      .from("books")
      .select("id")
      .eq("title", title.trim())
      .maybeSingle()
    if (existErr && existErr.code !== "PGRST116") throw existErr
    if (existing?.id) {
      if (author.trim()) await supabase.from("books").update({ author: author.trim() }).eq("id", existing.id)
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

  const ensureVersion = useCallback(async (bookId: string, version: string): Promise<{ id: string; name: string }> => {
    const base = (version || "1").trim()
    const { data: existing, error: existErr } = await supabase
      .from("book_versions")
      .select("id, name")
      .eq("book_id", bookId)
      .eq("name", base)
      .maybeSingle()
    if (existErr && existErr.code !== "PGRST116") throw existErr

    const computeNext = (b: string, names: Set<string>) => {
      const numericOnly = /^\d+$/.test(b)
      const suffixMatch = /^(.*?)(\d+)$/.exec(b)
      if (numericOnly) {
        let n = parseInt(b, 10) + 1
        while (names.has(String(n))) n++
        return String(n)
      }
      if (suffixMatch) {
        let prefix = suffixMatch[1]
        let n = parseInt(suffixMatch[2], 10) + 1
        let cand = `${prefix}${n}`
        while (names.has(cand)) { n++; cand = `${prefix}${n}` }
        return cand
      }
      let n = 2
      let cand = `${b}${n}`
      while (names.has(cand)) { n++; cand = `${b}${n}` }
      return cand
    }

    if (existing?.id) {
      const { data: all } = await supabase
        .from("book_versions")
        .select("name")
        .eq("book_id", bookId)
      const names = new Set<string>((all || []).map((r: any) => r.name as string))
      const next = computeNext(base, names)
      const { data: inserted, error: insErr } = await supabase
        .from("book_versions")
        .insert({ book_id: bookId, name: next })
        .select("id")
        .single()
      if (insErr) throw insErr
      setVersionNumber(next)
      return { id: inserted!.id as string, name: next }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("book_versions")
      .insert({ book_id: bookId, name: base })
      .select("id")
      .single()
    if (insErr) throw insErr
    return { id: inserted!.id as string, name: base }
  }, [setVersionNumber])

  const handleSave = useCallback(async () => {
    if (!bookTitle.trim() || detected.length === 0) return
    try {
      setSaving(true)
      const bookId = await ensureBook(bookTitle)
      const { id: versionId, name: finalVersionName } = await ensureVersion(bookId, versionNumber)

      // existing slugs
      const { data: existingSlugs } = await supabase
        .from("chapters")
        .select("slug")
        .eq("book_id", bookId)
        .eq("version_id", versionId)
      const used = new Set((existingSlugs || []).map((r: any) => r.slug as string))

      const { data: maxRow } = await supabase
        .from("chapters")
        .select("order_index")
        .eq("book_id", bookId)
        .order("order_index", { ascending: false })
        .limit(1)
      const startOrder = maxRow && maxRow.length > 0 ? (maxRow[0].order_index as number) + 1 : 1

      const rows = detected.map((c, i) => {
        const base = slugify(c.title) || `chapter-${i + 1}`
        let slug = base
        let k = 2
        while (used.has(slug)) {
          slug = `${base}-${k++}`
        }
        used.add(slug)
        return {
          book_id: bookId,
          version_id: versionId,
          slug,
          title: c.title.trim(),
          description: summarize(c.content) || null,
          content: c.content,
          order_index: startOrder + i,
        }
      })

      const { error: insErr } = await supabase.from("chapters").insert(rows as any[])
      if (insErr) throw insErr

      toast({ title: "Imported", description: `Imported ${rows.length} chapters into version ${finalVersionName}.` })
      setManuscript("")
    } catch (e: any) {
      toast({ title: "Failed to import", description: e?.message || "Unexpected error.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [bookTitle, detected, ensureBook, ensureVersion, versionNumber, toast])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Import Full Book",
    description: "Paste a full manuscript; we auto-detect chapters and save to a version.",
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Import Full Book — Auto Chapter Detection"
        description="Paste a full manuscript; we auto-detect chapters and save to a version."
        jsonLd={jsonLd}
      />
      <div className="container py-8">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
          </Button>
        </div>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Import Full Book</h1>
          <p className="text-muted-foreground">
            Paste the entire manuscript. We'll automatically identify chapters and summarize them for your table of contents.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Book Title</label>
                  <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="The Divine Gene" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Author (optional)</label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your Name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Version #</label>
                  <Input type="number" min={1} value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="1" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Manuscript</label>
                <Textarea
                  value={manuscript}
                  onChange={(e) => setManuscript(e.target.value)}
                  placeholder={"Paste the entire book here. We'll detect chapters like 'Chapter 1', 'Introduction', or markdown headings (##).'"}
                  className="min-h-[340px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button onClick={handleSave} disabled={detected.length === 0 || !bookTitle.trim() || saving}>
                  {saving ? "Importing…" : `Import ${detected.length > 0 ? `(${detected.length} chapters)` : ""}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview {detected.length > 0 ? `(${detected.length})` : ""}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detected.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chapters will appear here once detected.</div>
              ) : (
                <ol className="space-y-3">
                  {preview.map((c, i) => (
                    <li key={i} className="rounded-md border p-3">
                      <div className="font-medium">{i + 1}. {c.title}</div>
                      {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="mt-6 text-sm text-muted-foreground">
          Tip: We use common patterns like “Chapter 1”, “Introduction”, and “## Headings”. You can adjust chapter titles before saving by editing your manuscript.
        </aside>
      </div>
    </main>
  )
}

export default ImportFullBook
