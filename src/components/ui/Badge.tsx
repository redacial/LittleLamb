import { cn } from '../../lib/cn'
import type { BadgeType } from '../../types'

interface BadgeProps {
  label: string
  /**
   * 'verified' = admin-confirmed credential (periwinkle — the trust color);
   * 'self' = self-reported trait (sage). Color-coded per spec so families can tell
   * a vetted certification (CPR, First Aid) from a self-reported trait at a glance.
   */
  type?: BadgeType
  size?: 'sm' | 'md'
}

/**
 * Nanny trait/certification badge. DM Mono gives credential chips the "trust label"
 * treatment from DESIGN_SYSTEM.md §Trust Badges. Verified → periwinkle (the dedicated
 * trust color); self-reported → sage.
 */
export function Badge({ label, type = 'self', size = 'md' }: BadgeProps) {
  const verified = type === 'verified'
  return (
    <span
      title={verified ? 'Verified by Little Lamb' : 'Self-reported'}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-1.5 font-mono font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-mono-sm' : 'px-3 py-1 text-mono-sm',
        verified
          ? 'bg-ll-peri-light text-ll-peri-ink border-ll-peri' // ll-peri-ink = 8.1:1 (AA)
          : 'bg-ll-sage-light text-ll-sage-deep border-ll-sage',
      )}
    >
      {verified && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M8 1l1.8 1.3 2.2-.2.9 2 2 .9-.2 2.2L16 11l-1.3 1.8.2 2.2-2 .9-.9 2-2.2-.2L8 19l-1.8-1.3-2.2.2-.9-2-2-.9.2-2.2L0 11l1.3-1.8L1.1 7l2-.9.9-2 2.2.2L8 1z" />
        </svg>
      )}
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
