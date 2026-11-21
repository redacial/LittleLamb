import { DAYS } from './onboarding/AvailabilityEditor'
import { to12h } from '../lib/format'
import type { AvailabilityBlock } from '../types'

/**
 * A nanny's weekly availability as a lined-paper notepad, matching the cozy sticky-note aesthetic
 * (D77) — a warm display surface, not dense data. Each day is a ruled line with the day name in
 * Caveat and the hours in DM Mono; days with no block read "—" so the grid stays complete.
 *
 * Presentational only: it reads the same `availability` blocks the plain card did (same `DAYS`
 * order, same `to12h` formatting) — purely a visual reskin. The EDITOR (AvailabilityEditor) stays
 * functional/readable and is deliberately NOT notepad-styled.
 */
export function AvailabilityNotepad({ availability }: { availability: AvailabilityBlock[] }) {
  return (
    <div className="overflow-hidden rounded-ll-card border-1.5 border-ll-sand bg-ll-paper shadow-soft">
      {/* Taped-on title tab */}
      <div className="border-b-1.5 border-dashed border-ll-sand bg-ll-note-butter/60 px-5 py-3">
        <span className="font-display text-2xl leading-none text-ll-ink">Weekly availability</span>
      </div>
      <ul className="px-5 py-1">
        {DAYS.map((label, day) => {
          const block = availability?.find((a) => a.day === day)
          return (
            <li
              key={label}
              // The ruled line: a single bottom border on each row reads as notebook paper.
              className="flex items-baseline justify-between border-b border-ll-sand/70 py-2.5 last:border-b-0"
            >
              <span className="font-display text-xl leading-none text-ll-ink">{label}</span>
              <span
                className={
                  block ? 'font-mono text-mono-sm text-ll-ink' : 'font-mono text-mono-sm text-ll-warm-gray'
                }
              >
                {block ? `${to12h(block.start)} – ${to12h(block.end)}` : '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
