import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
  /** Show the "Nannies" subline under the wordmark. */
  withSubline?: boolean
  mark?: boolean
}

/** Little Lamb wordmark. Display serif "Little Lamb" with a small Nunito "Nannies" subline. */
export function Logo({ className, withSubline = true, mark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark && (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sage-100 ring-1 ring-sage-300">
          <LambMark className="h-6 w-6" />
        </span>
      )}
      <span className="leading-none">
        <span className="block font-display text-xl font-semibold tracking-tight text-charcoal">
          Little Lamb
        </span>
        {withSubline && (
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.22em] text-sage-600">
            Nannies
          </span>
        )}
      </span>
    </span>
  )
}

export function LambMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      <ellipse cx="32" cy="36" rx="14" ry="11" fill="#fff" stroke="#7bae8a" strokeWidth="2" />
      <circle cx="22" cy="30" r="6" fill="#fff" stroke="#7bae8a" strokeWidth="2" />
      <circle cx="42" cy="30" r="6" fill="#fff" stroke="#7bae8a" strokeWidth="2" />
      <circle cx="32" cy="22" r="6.5" fill="#fff" stroke="#7bae8a" strokeWidth="2" />
      <ellipse cx="32" cy="40" rx="8" ry="7" fill="#2f2b28" />
      <circle cx="29" cy="39" r="1.3" fill="#faf6ef" />
      <circle cx="35" cy="39" r="1.3" fill="#faf6ef" />
    </svg>
  )
}
