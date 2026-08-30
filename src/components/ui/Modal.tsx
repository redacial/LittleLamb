import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { springGentle } from '../../lib/motion'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

/** Everything focusable inside the panel, in DOM order. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// 24px radius, cream surface, gentle-spring entrance. DESIGN_SYSTEM.md §Modals + §Motion.
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const prefersReduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement | null>(null)
  /** The element focused before the dialog opened — focus goes back here on close. */
  const restoreRef = useRef<HTMLElement | null>(null)

  // Remember the trigger the moment we open, before focus moves into the panel.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement as HTMLElement | null
  }, [open])

  // Move focus into the panel on open, and restore it to the trigger on close.
  // Without this a keyboard user's focus stays on the page BEHIND the dialog — the
  // `aria-modal="true"` was a promise the component wasn't keeping.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const first = panel.querySelector<HTMLElement>(FOCUSABLE)
    // Prefer the first real control; fall back to the panel itself (tabIndex={-1}) so focus
    // is inside the dialog even when it holds nothing focusable.
    ;(first ?? panel).focus()

    return () => {
      // Restore on close/unmount. Guard against an element that has since left the DOM.
      const target = restoreRef.current
      if (target && document.contains(target)) target.focus()
    }
  }, [open])

  // Escape to dismiss + a focus trap on Tab. The trap cycles within the panel so focus can
  // never land on the inert page behind the dialog.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        // Nothing to cycle through — keep focus pinned to the panel.
        e.preventDefault()
        panel.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null

      // Wrap at both ends, and pull focus back in if it somehow escaped the panel.
      if (e.shiftKey) {
        if (active === firstItem || active === panel || !panel.contains(active)) {
          e.preventDefault()
          lastItem.focus()
        }
      } else if (active === lastItem || active === panel || !panel.contains(active)) {
        e.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const panelMotion = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 8 },
        transition: springGentle,
      }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/*
            The backdrop stays a click-to-dismiss surface for pointer users, but it is now
            INERT to assistive tech and to the keyboard: it used to be a full-screen
            <button aria-label="Close"> announced BEFORE the dialog's own content, so a
            screen-reader user met "Close" before they ever heard what they were closing.
            Dismissal for keyboard/AT users is the real ✕ in the panel, plus Escape.
          */}
          <motion.div
            data-ll-modal-backdrop
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 bg-ll-ink/40 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={panelRef}
            data-ll-modal-panel
            tabIndex={-1}
            className={cn(
              'relative w-full max-w-lg rounded-t-ll-modal bg-ll-cream p-6 shadow-lift sm:rounded-ll-modal',
              'max-h-[90vh] overflow-y-auto outline-none',
              className,
            )}
            {...panelMotion}
          >
            {/*
              A real, visible close control. Previously the ONLY dismissal affordance was the
              backdrop — and on mobile the panel is bottom-anchored, so a touch user's only exit
              was a precise tap on a sliver of backdrop above the sheet. 44px min tap target
              per DESIGN_SYSTEM.md §Buttons (WCAG 2.5.5).
            */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                'absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full',
                'text-xl leading-none text-ll-warm-gray transition-colors',
                'hover:bg-ll-cream-dark hover:text-ll-ink',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ll-sage',
              )}
            >
              <span aria-hidden="true">✕</span>
            </button>
            {/* pr-12 keeps the heading clear of the close button. */}
            {title && <h2 className="mb-4 pr-12 font-display text-display-sm">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
