// The waitlist modal's context and its consumer hook.
//
// Split out of WaitlistModal.tsx so that file exports components ONLY: React Fast Refresh
// silently falls back to a full page reload for any module that mixes component and
// non-component exports, which is why eslint-plugin-react-refresh flags it. The provider
// still lives alongside the modal it drives; only the context object and hook moved.
import { createContext, useContext } from 'react'
import type { SubmissionKind, WaitlistRole } from '../waitlist'

export interface OpenOptions {
  kind?: SubmissionKind
  role?: WaitlistRole
}

export interface WaitlistContextValue {
  openWaitlist: (opts?: OpenOptions) => void
  openContact: (opts?: OpenOptions) => void
}

export const WaitlistContext = createContext<WaitlistContextValue | null>(null)

export function useWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext)
  if (!ctx) throw new Error('useWaitlist must be used within <WaitlistProvider>')
  return ctx
}
