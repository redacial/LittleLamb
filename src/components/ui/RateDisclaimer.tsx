// Wage framing, shown wherever a rate appears.
//
// Little Lamb is explicitly NOT an employer and does not process wages — families pay
// nannies directly (CLAUDE.md "What Is NOT in the Platform"). Rate ranges exist purely
// to match families and nannies who want the same thing. Every surface that shows a
// rate must also say this, so no one reads a displayed range as a rate the platform
// sets, collects, or guarantees.

import { cn } from '../../lib/cn'

interface Props {
  className?: string
  /** `full` explains the arrangement; `short` is a one-liner for dense surfaces. */
  variant?: 'full' | 'short'
}

export function RateDisclaimer({ className, variant = 'full' }: Props) {
  return (
    <p className={cn('flex gap-1.5 text-sm text-ll-warm-gray', className)}>
      <InfoIcon />
      <span>
        {variant === 'short' ? (
          <>A matching guide only — pay is arranged directly.</>
        ) : (
          <>
            A matching guide only. Pay is arranged directly between family and nanny —
            Little Lamb does not process or guarantee wages.
          </>
        )}
      </span>
    </p>
  )
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ll-peri"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.4A5.6 5.6 0 118 13.6 5.6 5.6 0 018 2.4zM7.3 6.9h1.4v4.4H7.3V6.9zM8 4.5a.85.85 0 110 1.7.85.85 0 010-1.7z" />
    </svg>
  )
}
