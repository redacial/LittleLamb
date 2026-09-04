import { cn } from '../../lib/cn'

/**
 * A two-button Yes / No toggle — used where a boolean is friendlier and faster than a checkbox or a
 * free-text field (partner meeting 2026-09: "minimize info with buttons", e.g. pets Y/N with
 * optional detail). Renders as a labelled radiogroup so it's keyboard- and screen-reader-navigable.
 */
export function YesNo({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium text-ll-ink">{label}</p>
      <div role="radiogroup" aria-label={label} className="inline-flex gap-2">
        {[
          { v: true, text: 'Yes' },
          { v: false, text: 'No' },
        ].map((opt) => {
          const selected = value === opt.v
          return (
            <button
              key={opt.text}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.v)}
              className={cn(
                'min-w-[4.5rem] rounded-ll-input border-1.5 px-4 py-2 text-sm font-semibold transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ll-sage',
                selected
                  ? 'border-ll-sage bg-ll-sage-light text-ll-sage-deep'
                  : 'border-ll-cream-dark bg-white text-ll-warm-gray hover:border-ll-sage-mid',
              )}
            >
              {opt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
