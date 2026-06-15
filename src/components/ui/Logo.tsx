import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
  /** Show the "Nannies" subline under the wordmark. */
  withSubline?: boolean
  mark?: boolean
}

/** Little Lamb wordmark. Caveat display "Little Lamb" with a small DM Mono "Nannies" subline. */
export function Logo({ className, withSubline = true, mark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark && (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ll-sage-light border-1.5 border-ll-sage">
          <LambMark className="h-6 w-6" />
        </span>
      )}
      <span className="leading-none">
        <span className="block font-display text-3xl font-bold tracking-tight text-ll-ink">
          Little Lamb
        </span>
        {withSubline && (
          <span className="block font-mono text-[0.6rem] font-medium uppercase tracking-[0.22em] text-ll-sage-deep">
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
      <ellipse cx="32" cy="36" rx="14" ry="11" fill="#fff" stroke="#8FAF8A" strokeWidth="2" />
      <circle cx="22" cy="30" r="6" fill="#fff" stroke="#8FAF8A" strokeWidth="2" />
      <circle cx="42" cy="30" r="6" fill="#fff" stroke="#8FAF8A" strokeWidth="2" />
      <circle cx="32" cy="22" r="6.5" fill="#fff" stroke="#8FAF8A" strokeWidth="2" />
      <ellipse cx="32" cy="40" rx="8" ry="7" fill="#2C2416" />
      <circle cx="29" cy="39" r="1.3" fill="#F5F0E8" />
      <circle cx="35" cy="39" r="1.3" fill="#F5F0E8" />
    </svg>
  )
}
