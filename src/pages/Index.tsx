import hero from '@/assets/hero-reading.jpg'
import { Button } from '@/components/ui/button'
import { SEO } from '@/components/SEO'
import { book } from '@/content/book'
import { Link } from 'react-router-dom'

const Index = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
  }

  return (
    <main>
      <SEO
        title={`Read ${book.title} Online | ${book.subtitle ?? 'Read Free'}`}
        description={book.description}
        image={hero}
        jsonLd={jsonLd}
      />
      <section className="relative overflow-hidden">
        <div className="hero-gradient absolute inset-0" aria-hidden />
        <div className="container relative grid min-h-[70vh] gap-8 py-16 md:grid-cols-2">
          <div className="flex items-center">
            <div className="glass-card rounded-2xl p-8">
              <h1 className="mb-4 text-4xl font-bold leading-tight">
                Read {book.title} Online
              </h1>
              <p className="mb-6 text-lg text-muted-foreground">
                {book.subtitle} — {book.description}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="hero" size="xl">
                  <Link to={`/read/${book.chapters[0].slug}`}>Start Reading</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to={`/read/${book.chapters[0].slug}`}>Table of Contents</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/import">Import Book</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <img
              src={hero}
              alt={book.coverAlt}
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

