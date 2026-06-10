import { cn } from '../../lib/cn'
import type { BadgeType } from '../../types'

interface BadgeProps {
  label: string
  /** 'verified' = admin-confirmed (sage); 'self' = self-reported (terracotta). Color-coded per spec. */
  type?: BadgeType
  size?: 'sm' | 'md'
}

/**
 * Nanny trait/certification badge. The two badge types are deliberately color-coded so
 * families can tell an admin-verified certification (CPR, First Aid) from a self-reported
 * trait (Pet-Friendly, Ages 0–2) at a glance.
 */
export function Badge({ label, type = 'self', size = 'md' }: BadgeProps) {
  const verified = type === 'verified'
  return (
    <span
      title={verified ? 'Verified by Little Lamb' : 'Self-reported'}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        verified
          ? 'bg-sage-100 text-sage-700 ring-1 ring-inset ring-sage-300'
          : 'bg-terracotta-50 text-terracotta-700 ring-1 ring-inset ring-terracotta-200',
      )}
    >
      {verified && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
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

const tones: Record<string, string> = {
  confirmed: 'bg-sage-100 text-sage-700',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-charcoal/10 text-charcoal-muted',
  open: 'bg-terracotta-50 text-terracotta-700',
  neutral: 'bg-cream-200 text-charcoal-muted',
}

export function StatusPill({ status, tone = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        tones[tone],
      )}
    >
      {status}
    </span>
  )
}
