import { cn } from '../../lib/cn'
import type { Booking } from '../../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Read-only-ish month grid. Bookings are color-coded (green confirmed / amber pending). Clicking
 * a day fires onPickDay (starts the booking flow); clicking a booking fires onPickBooking.
 * `year`/`month` are passed in so the component stays pure (no Date.now in module scope).
 */
export function MonthGrid({
  year,
  month,
  today,
  bookings,
  onPickDay,
  onPickBooking,
}: {
  year: number
  month: number // 0-based
  today: string
  bookings: Booking[]
  onPickDay?: (date: string) => void
  onPickBooking?: (b: Booking) => void
}) {
  const first = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const byDate = new Map<string, Booking[]>()
  bookings.forEach((b) => {
    if (b.status === 'cancelled') return
    byDate.set(b.date, [...(byDate.get(b.date) ?? []), b])
  })

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-charcoal/[0.06]">
      <div className="grid grid-cols-7 border-b border-charcoal/10 bg-cream-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-charcoal-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-20 border-b border-r border-charcoal/5 bg-cream-50" />
          const date = ymd(year, month, day)
          const isToday = date === today
          const dayBookings = byDate.get(date) ?? []
          return (
            <button
              key={i}
              onClick={() => onPickDay?.(date)}
              className="min-h-20 border-b border-r border-charcoal/5 p-1.5 text-left transition-colors hover:bg-sage-50"
            >
              <span className={cn('inline-grid h-6 w-6 place-items-center rounded-full text-sm', isToday && 'bg-charcoal text-cream font-bold')}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayBookings.slice(0, 2).map((b) => (
                  <span
                    key={b.id}
                    onClick={(e) => { e.stopPropagation(); onPickBooking?.(b) }}
                    className={cn(
                      'block truncate rounded px-1 py-0.5 text-[0.7rem] font-semibold',
                      b.status === 'confirmed' ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {b.nannyName ?? b.familyName ?? 'Booking'}
                  </span>
                ))}
                {dayBookings.length > 2 && <span className="px-1 text-[0.7rem] text-charcoal-muted">+{dayBookings.length - 2}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { ymd }
