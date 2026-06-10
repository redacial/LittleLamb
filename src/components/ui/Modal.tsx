import { useEffect } from 'react'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-t-2xl bg-cream p-6 shadow-lift sm:rounded-2xl',
          'max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        {title && <h2 className="mb-4 font-display text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
