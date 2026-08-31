// Toast — the app's shared, ephemeral status surface.
//
// Reason for existing: booking confirmation succeeded SILENTLY (the modal closed and the calendar
// just updated), and so did approve/reject and settings saves. A parent booking childcare — the
// single most consequential action on the platform — got no confirmation at all. This gives every
// success/status a small, announced, self-dismissing acknowledgement without blocking the page.
//
// Design: DESIGN_SYSTEM.md tokens (sage = success, terra = error), gentle spring per §Motion,
// bottom-anchored on mobile so it clears the thumb zone, top-right on larger screens.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { springGentle } from '../../lib/motion'
import { cn } from '../../lib/cn'
import { ToastContext, type ToastVariant } from './toast-context'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

/** How long a toast lingers before auto-dismissing. Long enough to read a sentence. */
const TIMEOUT_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  // Monotonic id source. A ref, not state, so incrementing never triggers a render.
  const nextId = useRef(0)
  // Track timers so we can clear them on manual dismiss and on unmount (no setState-after-unmount).
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), TIMEOUT_MS)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  // Clear any live timers if the provider itself unmounts.
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const VARIANT_STYLE: Record<ToastVariant, string> = {
  success: 'border-ll-sage bg-ll-sage-light text-ll-sage-deep',
  info: 'border-ll-warm-gray bg-white text-ll-ink',
  error: 'border-red-400 bg-white text-red-700',
}

const VARIANT_GLYPH: Record<ToastVariant, string> = {
  success: '✓',
  info: 'ℹ',
  error: '!',
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const prefersReduced = useReducedMotion()
  return (
    // aria-live=polite so a screen reader announces new toasts without interrupting.
    // Fixed, non-blocking: pointer-events only on the toasts themselves, not the empty column.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const motionProps = prefersReduced
            ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
            : {
                initial: { opacity: 0, y: 16, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: 8, scale: 0.97 },
                transition: springGentle,
              }
          return (
            <motion.div
              key={t.id}
              layout={!prefersReduced}
              {...motionProps}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-ll-card border-1.5 px-4 py-3 shadow-lift',
                VARIANT_STYLE[t.variant],
              )}
            >
              <span aria-hidden="true" className="mt-0.5 font-mono text-sm leading-none">
                {VARIANT_GLYPH[t.variant]}
              </span>
              <p className="flex-1 text-sm font-semibold">{t.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-current/70 transition-colors hover:bg-black/5 hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
              >
                <span aria-hidden="true" className="text-sm leading-none">✕</span>
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
