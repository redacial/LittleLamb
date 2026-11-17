// A row of tappable pill chips — the shared selection primitive for the Care.com-style nanny
// onboarding. Single-select (experience band) or multi-select (specialties, activities, …).
//
// Visuals follow DESIGN_SYSTEM.md §Component Patterns: pill (rounded-full), DM Mono mono-sm,
// 1.5px border, sage-light fill when selected, spring scale on hover (reduced-motion aware).
// Mirrors the existing badge-chip styling in NannySetupWizard so the whole wizard reads as one.
import { motion } from 'framer-motion'
import { useChipHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

export interface ChipOption {
  id: string
  label: string
}

interface Props {
  options: ChipOption[]
  /** Currently selected ids. */
  value: string[]
  onChange: (next: string[]) => void
  /** Multi-select when true; single-select (radio-like, tap-to-toggle) when false/omitted. */
  multiple?: boolean
  /** Optional id prefix for stable keys when several groups render on one page. */
  idPrefix?: string
}

export function ChipGroup({ options, value, onChange, multiple = false, idPrefix }: Props) {
  const chipHover = useChipHover()

  function toggle(id: string) {
    const on = value.includes(id)
    if (multiple) {
      onChange(on ? value.filter((v) => v !== id) : [...value, id])
    } else {
      // Single-select: tapping the selected one clears it; tapping another replaces.
      onChange(on ? [] : [id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <motion.button
            key={`${idPrefix ?? ''}${o.id}`}
            type="button"
            onClick={() => toggle(o.id)}
            aria-pressed={on}
            {...chipHover}
            className={cn(
              'rounded-full px-3 py-1.5 font-mono text-mono-sm font-medium border-1.5 transition-colors',
              on
                ? 'bg-ll-sage-light text-ll-sage-deep border-ll-sage'
                : 'bg-white text-ll-warm-gray border-ll-cream-dark hover:border-ll-sage',
            )}
          >
            {o.label}
          </motion.button>
        )
      })}
    </div>
  )
}
