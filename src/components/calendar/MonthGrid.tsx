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
    <div className="overflow-hidden rounded-ll-card bg-white shadow-soft border-1.5 border-ll-cream-dark">
      <div className="grid grid-cols-7 border-b border-ll-cream-dark bg-ll-cream-dark">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-mono-sm font-medium uppercase tracking-wide font-mono text-ll-warm-gray">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-20 border-b border-r border-ll-cream-dark bg-ll-cream" />
          const date = ymd(year, month, day)
          const isToday = date === today
          const dayBookings = byDate.get(date) ?? []
          return (
            <button
              key={i}
              onClick={() => onPickDay?.(date)}
              className="min-h-20 border-b border-r border-ll-cream-dark p-1.5 text-left transition-colors hover:bg-ll-sage-light"
            >
              <span className={cn('inline-grid h-6 w-6 place-items-center rounded-full text-sm', isToday && 'bg-ll-ink text-ll-cream font-bold')}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayBookings.slice(0, 2).map((b) => (
                  <span
                    key={b.id}
                    onClick={(e) => { e.stopPropagation(); onPickBooking?.(b) }}
                    className={cn(
                      'block truncate rounded-ll-tag px-1 py-0.5 text-[0.7rem] font-semibold',
                      b.status === 'confirmed' ? 'bg-ll-sage-light text-ll-sage-deep' : 'bg-ll-terra-light text-ll-terra-deep',
                    )}
                  >
                    {b.nannyName ?? b.familyName ?? 'Booking'}
                  </span>
                ))}
                {dayBookings.length > 2 && <span className="px-1 text-[0.7rem] text-ll-warm-gray">+{dayBookings.length - 2}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {/* Color-coding legend: confirmed = sage, pending = terra-amber, booked = periwinkle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ll-cream-dark bg-ll-cream px-3 py-2 font-mono text-mono-sm text-ll-warm-gray">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-confirmed" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-pending" /> Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-booked" /> Booked
        </span>
      </div>
    </div>
  )
}

export { ymd }
