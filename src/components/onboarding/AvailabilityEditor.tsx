import type { AvailabilityBlock } from '../../types'
import { Input } from '../ui'
import { cn } from '../../lib/cn'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Weekly recurring availability — one optional time range per day. Empty days are left out of
 * the saved blocks (a blank day = unavailable, per the calendar spec). This powers booking.
 */
export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityBlock[]
  onChange: (blocks: AvailabilityBlock[]) => void
}) {
  function blockFor(day: number) {
    return value.find((b) => b.day === day)
  }

  function setDay(day: number, patch: Partial<AvailabilityBlock>) {
    const others = value.filter((b) => b.day !== day)
    const current = blockFor(day) ?? { day, start: '15:00', end: '20:00' }
    onChange([...others, { ...current, ...patch }].sort((a, b) => a.day - b.day))
  }

  function toggle(day: number, on: boolean) {
    if (on) setDay(day, {})
    else onChange(value.filter((b) => b.day !== day))
  }

  return (
    <div className="space-y-2">
      {DAYS.map((label, day) => {
        const block = blockFor(day)
        const on = !!block
        return (
          <div
            key={label}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-xl border p-3',
              on ? 'border-sage-300 bg-sage-50' : 'border-charcoal/10 bg-white',
            )}
          >
            <label className="flex w-32 items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => toggle(day, e.target.checked)}
                className="h-4 w-4 rounded accent-sage-500"
              />
              {label}
            </label>
            {on && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`${label} start`}
                  value={block!.start}
                  onChange={(e) => setDay(day, { start: e.target.value })}
                  className="w-32"
                />
                <span className="text-charcoal-muted">to</span>
                <Input
                  type="time"
                  aria-label={`${label} end`}
                  value={block!.end}
                  onChange={(e) => setDay(day, { end: e.target.value })}
                  className="w-32"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { DAYS }
