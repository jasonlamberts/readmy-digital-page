import { useEffect, useState } from 'react'

export const ProgressBar = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('reader-content')
      if (!el) return
      const total = el.scrollHeight - el.clientHeight
      const current = el.scrollTop
      const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0
      setProgress(pct)
    }
    const el = document.getElementById('reader-content')
    el?.addEventListener('scroll', onScroll, { passive: true })
    return () => el?.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="sticky top-0 left-0 right-0 z-40 h-1 bg-secondary">
      <div
        className="h-full hero-gradient"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
    </div>
  )
}
