import { useEffect, useState } from 'react'

const STORAGE_KEY = 'll_ref'

/**
 * Captures a ?ref=CODE query param on first load and persists it so attribution survives the
 * signup flow. Returns the captured code (or null). Lightweight attribution only — never a
 * security boundary (CLAUDE.md Part 16).
 */
export function useReferralCapture(): string | null {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      const clean = ref.replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase()
      if (clean) {
        sessionStorage.setItem(STORAGE_KEY, clean)
        setCode(clean)
        return
      }
    }
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) setCode(stored)
  }, [])

  return code
}

export function clearCapturedReferral() {
  sessionStorage.removeItem(STORAGE_KEY)
}
