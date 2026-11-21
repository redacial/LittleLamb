import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query and re-render when it flips. Used to switch behaviour (not just
 * styling) at a breakpoint — e.g. the nanny directory opens a profile in a right-side pane on wide
 * screens but navigates to a full-screen route on phones.
 *
 * SSR/test-safe: `window.matchMedia` is missing in some non-browser/jsdom contexts, so we guard it
 * and default to `false` (the narrow/mobile branch — the safer default, since it always has a real
 * destination to navigate to rather than depending on a pane that may not be laid out).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange() // sync in case the query changed between render and effect
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind's `lg` breakpoint (min-width: 1024px) — the app's desktop threshold. */
export const LG_QUERY = '(min-width: 1024px)'
