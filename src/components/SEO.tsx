import { Helmet } from 'react-helmet-async'

type SEOProps = {
  title: string
  description: string
  canonical?: string
  image?: string
  jsonLd?: Record<string, any>
}

export const SEO = ({ title, description, canonical, image, jsonLd }: SEOProps) => {
  const url = canonical || (typeof window !== 'undefined' ? window.location.href : undefined)
  const siteName = 'The Quiet Momentum'

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:type" content="article" />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
