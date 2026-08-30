import { useState } from 'react'
import { cn } from '../../lib/cn'
import { isPastDate } from '../../lib/bookingRules'
import type { Booking } from '../../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Non-colour status signal. Booking status used to be carried by BACKGROUND COLOUR ALONE
 * (sage = confirmed, terra = pending), which fails WCAG 2.2 SC 1.4.1 Use of Color — a
 * red-green colourblind parent could not tell a confirmed sitter from an unconfirmed request.
 * On this platform that distinction is "childcare is handled" vs "nobody is coming", so it
 * cannot rest on hue.
 *
 * Each entry now carries a GLYPH (visible — helps colourblind sighted users, who are not
 * running a screen reader) plus a spelled-out status in the accessible name (helps AT users).
 * Colour is retained as a redundant third cue for everyone else.
 */
const STATUS_MARK: Record<string, { glyph: string; label: string }> = {
  confirmed: { glyph: '✓', label: 'Confirmed' },
  pending: { glyph: '◷', label: 'Pending' },
  open: { glyph: '◇', label: 'Open' },
  unmatched: { glyph: '◇', label: 'Unmatched' },
  same_day_review: { glyph: '!', label: 'Same-day review' },
  cancelled: { glyph: '✕', label: 'Cancelled' },
}

function statusMark(status: string) {
  return STATUS_MARK[status] ?? { glyph: '•', label: status }
}

/**
 * Month grid. Bookings are color-coded (green confirmed / amber pending). Interactions:
 *  - Click (or keyboard-activate) a day → onPickDay (single-day booking flow).
 *  - Press-and-drag across days → onPickRange(start, end) once supplied (multi-day select).
 * Clicking a booking label fires onPickBooking. `year`/`month` are passed in so the
 * component stays pure (no Date.now in module scope).
 */
export function MonthGrid({
  year,
  month,
  today,
  bookings,
  onPickDay,
  onPickBooking,
  onPickRange,
}: {
  year: number
  month: number // 0-based
  today: string
  bookings: Booking[]
  onPickDay?: (date: string) => void
  onPickBooking?: (b: Booking) => void
  /** Fired when the user drags across a range of days (start ≤ end). Optional. */
  onPickRange?: (startDate: string, endDate: string) => void
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

  // Drag-select state. `anchor` is the day the pointer went down on; `hover` is the
  // current day under the pointer. Both are day-of-month numbers within this month.
  const [anchor, setAnchor] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const dragging = anchor !== null

  const inRange = (day: number) => {
    if (anchor === null || hover === null) return false
    const lo = Math.min(anchor, hover)
    const hi = Math.max(anchor, hover)
    return day >= lo && day <= hi
  }

  function startDrag(day: number) {
    setAnchor(day)
    setHover(day)
  }

  function endDrag() {
    if (anchor === null || hover === null) {
      setAnchor(null)
      setHover(null)
      return
    }
    const lo = Math.min(anchor, hover)
    const hi = Math.max(anchor, hover)
    if (lo === hi) {
      // No drag distance — treat as a plain day pick.
      onPickDay?.(ymd(year, month, lo))
    } else if (onPickRange) {
      onPickRange(ymd(year, month, lo), ymd(year, month, hi))
    } else {
      // No range handler — fall back to picking the start day.
      onPickDay?.(ymd(year, month, lo))
    }
    setAnchor(null)
    setHover(null)
  }

  return (
    <div className="overflow-hidden rounded-ll-card bg-white shadow-soft border-1.5 border-ll-cream-dark">
      <div className="grid grid-cols-7 border-b border-ll-cream-dark bg-ll-cream-dark">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-mono-sm font-medium uppercase tracking-wide font-mono text-ll-warm-gray">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 select-none"
        // End any in-progress drag if the pointer leaves the grid or is released anywhere.
        onPointerLeave={() => dragging && endDrag()}
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-20 border-b border-r border-ll-cream-dark bg-ll-cream" />
          const date = ymd(year, month, day)
          const isToday = date === today
          // A day that has already passed cannot be booked (see src/lib/bookingRules.ts), so
          // don't offer it. Disabling also kills the drag handlers, so a drag can neither
          // start on nor sweep through a past day.
          const isPast = isPastDate(date, today)
          const dayBookings = byDate.get(date) ?? []
          const selected = inRange(day)
          return (
            <button
              key={i}
              type="button"
              aria-pressed={selected}
              disabled={isPast}
              onPointerDown={() => !isPast && startDrag(day)}
              onPointerEnter={() => dragging && setHover(day)}
              onPointerUp={() => endDrag()}
              // Keyboard activation (Enter/Space) never starts a drag → single-day pick.
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPickDay?.(date)
                }
              }}
              className={cn(
                'min-h-20 border-b border-r border-ll-cream-dark p-1.5 text-left transition-colors',
                // Muted and non-interactive rather than merely inert — a dead control that
                // still looks live is the worse experience.
                isPast
                  ? 'cursor-not-allowed bg-ll-cream text-ll-warm-gray/60'
                  : selected
                    ? 'bg-ll-sage-light'
                    : 'hover:bg-ll-sage-light/60',
              )}
            >
              <span className={cn('inline-grid h-6 w-6 place-items-center rounded-full text-sm', isToday && 'bg-ll-ink text-ll-cream font-bold')}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayBookings.slice(0, 2).map((b) => {
                  const mark = statusMark(b.status)
                  const who = b.nannyName ?? b.familyName ?? 'Booking'
                  return (
                    <span
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      // Spelled-out status for assistive tech — the glyph alone is ambiguous
                      // read aloud, and the visible label is truncated at this size.
                      aria-label={`${mark.label}: ${who}`}
                      title={`${mark.label} — ${who}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onPickBooking?.(b) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPickBooking?.(b) }
                      }}
                      className={cn(
                        'flex items-center gap-0.5 truncate rounded-ll-tag px-1 py-0.5 text-[0.7rem] font-semibold',
                        b.status === 'confirmed' ? 'bg-ll-sage-light text-ll-sage-deep' : 'bg-ll-terra-soft text-ll-ink',
                      )}
                    >
                      {/* Visible glyph: the non-colour cue a sighted colourblind user relies on. */}
                      <span aria-hidden="true" className="shrink-0 font-mono leading-none">{mark.glyph}</span>
                      <span className="truncate">{who}</span>
                    </span>
                  )
                })}
                {dayBookings.length > 2 && <span className="px-1 text-[0.7rem] text-ll-warm-gray">+{dayBookings.length - 2}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {/*
        Legend. Each entry pairs its colour swatch with the SAME glyph used on the entries
        above, so the legend teaches the non-colour cue rather than being colour-only itself
        (it was three identical dots distinguished purely by hue).
      */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ll-cream-dark bg-ll-cream px-3 py-2 font-mono text-mono-sm text-ll-warm-gray">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full bg-confirmed text-[0.6rem] leading-none text-ll-ink">
            {STATUS_MARK.confirmed.glyph}
          </span>
          Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full bg-pending text-[0.6rem] leading-none text-ll-ink">
            {STATUS_MARK.pending.glyph}
          </span>
          Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full bg-booked text-[0.6rem] leading-none text-ll-ink">
            ●
          </span>
          Booked
        </span>
        {onPickRange && <span className="ml-auto">Tip: drag across days to select a range</span>}
      </div>
    </div>
  )
}

