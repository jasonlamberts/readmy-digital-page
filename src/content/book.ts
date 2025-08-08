export type Chapter = {
  slug: string
  title: string
  description?: string
  content: string
}

export type Book = {
  title: string
  subtitle?: string
  author: string
  description: string
  coverAlt: string
  chapters: Chapter[]
}

export const book: Book = {
  title: "The Quiet Momentum",
  subtitle: "Finding Focus in a Noisy World",
  author: "Your Name",
  description:
    "A concise guide to building calm, consistent habits that lead to meaningful progress.",
  coverAlt: "Open book on a minimalist desk with soft gradient lighting",
  chapters: [
    {
      slug: "introduction",
      title: "Introduction",
      description: "Why momentum matters more than motivation.",
      content: `Momentum is the quiet force that carries us from intention to action. It doesn't arrive with fireworks or fanfare; it builds slowly, like a tide that seems still—until you notice how far it has carried you.

In a world that celebrates big wins and viral breakthroughs, the steady work often goes unnoticed. But focus is a practice. Progress is a rhythm. This book is about learning to keep your cadence when the world is loud.

We will explore small systems with outsized impact: how to design your environment, reduce cognitive drag, and treat attention like the finite resource it is. You'll build routines that feel sustainable, not heroic. You'll relearn how to start—without waiting for perfect conditions.`,
    },
    {
      slug: "chapter-1",
      title: "Designing for Focus",
      description: "How environments shape attention.",
      content: `Attention is architectural. The spaces we inhabit—physical or digital—pull at our mind. By default, most environments are optimized for availability, not depth.

Designing for focus begins with subtraction. Remove the surfaces that accumulate distraction: the extra tab, the unchecked badges, the desk clutter that whispers of unfinished tasks. Create a single path forward.

Try this: choose one place where deep work happens. Protect it with ritual. A specific playlist, a warm drink, a screen layout that appears only for one purpose. Over time, your mind will learn the cue—and the transition into depth will become smoother, faster, kinder.`,
    },
    {
      slug: "chapter-2",
      title: "Consistency Without Burnout",
      description: "Sustainable cadence beats sporadic sprints.",
      content: `Consistency is a promise you make to your future self. But promises built on pressure fracture quickly. The answer is not to try harder—it's to make it easier to try.

Set your minimums. Define the smallest version of the habit that still counts. Two pages. Ten minutes. One paragraph. Small is not a compromise; it's a strategy that keeps the door open.

Protect recovery with the same care you protect effort. Rest is not the absence of progress; it's the condition for it. Build whitespace into your days. Leave a little energy in the tank so tomorrow doesn't have to start from zero.`,
    },
  ],
}
