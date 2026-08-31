// Context + hook for the Toast system, split out from Toast.tsx so that the component module
// exports only components (react-refresh/only-export-components — same reason MonthGrid's and
// RateRangeInput's helpers live in sibling files).
import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'info' | 'error'

export interface ToastApi {
  /** Show a toast. Defaults to the 'success' variant. Returns nothing — fire and forget. */
  show: (message: string, variant?: ToastVariant) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Access the toast API. Throws if no ToastProvider is above — a wiring error, not a no-op. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
