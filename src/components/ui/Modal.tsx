import { useEffect } from 'react'
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

// 24px radius, cream surface, gentle-spring entrance. DESIGN_SYSTEM.md §Modals + §Motion.
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
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
          <motion.button
            className="absolute inset-0 bg-ll-ink/40 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            className={cn(
              'relative w-full max-w-lg rounded-t-ll-modal bg-ll-cream p-6 shadow-lift sm:rounded-ll-modal',
              'max-h-[90vh] overflow-y-auto',
              className,
            )}
            {...panelMotion}
          >
            {title && <h2 className="mb-4 font-display text-display-sm">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
