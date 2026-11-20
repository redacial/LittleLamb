import { cn } from '../../lib/cn'
import type { BadgeType } from '../../types'

interface BadgeProps {
  label: string
  /**
   * Visual grouping only — NOT a verification claim (Little Lamb is a job-listing service and
   * verifies nothing; D77). 'verified' = a credential a sitter self-reports (CPR, First Aid —
   * periwinkle so it reads as a credential); 'self' = a self-reported trait (sage). Both are
   * self-reported; the color just distinguishes a certification from a trait at a glance.
   */
  type?: BadgeType
  size?: 'sm' | 'md'
}

/**
 * Sitter trait/credential badge. DM Mono gives credential chips the "label" treatment from
 * DESIGN_SYSTEM.md. All badges are SELF-REPORTED — the tooltip says so for both types, and
 * there is no checkmark/"verified" affordance that would imply Little Lamb confirmed it.
 * Periwinkle = a self-reported credential; sage = a self-reported trait.
 */
export function Badge({ label, type = 'self', size = 'md' }: BadgeProps) {
  const credential = type === 'verified'
  return (
    <span
      title="Self-reported — not verified by Little Lamb"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-1.5 font-mono font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-mono-sm' : 'px-3 py-1 text-mono-sm',
        credential
          ? 'bg-ll-peri-light text-ll-peri-ink border-ll-peri' // ll-peri-ink = 8.1:1 (AA)
          : 'bg-ll-sage-light text-ll-sage-deep border-ll-sage',
      )}
    >
      {label}
    </span>
  )
}

interface StatusPillProps {
  status: string
  tone?: 'confirmed' | 'pending' | 'cancelled' | 'open' | 'neutral'
}

// Pills carry status by ground + label (never color alone). All pairs clear WCAG AA:
// pending uses ink on terra-soft (terra-deep on terra-light was only 3.4:1).
const tones: Record<string, string> = {
  confirmed: 'bg-ll-sage-light text-ll-sage-deep',
  pending: 'bg-ll-terra-soft text-ll-ink',
  cancelled: 'bg-ll-cream-dark text-ll-warm-gray',
  open: 'bg-ll-peri-light text-ll-peri-ink',
  neutral: 'bg-ll-cream-dark text-ll-warm-gray',
}

export function StatusPill({ status, tone = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-mono-sm font-medium uppercase tracking-wide',
        tones[tone],
      )}
    >
      {status}
    </span>
  )
}
