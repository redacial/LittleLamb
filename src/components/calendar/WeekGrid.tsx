import { useState } from 'react'
import { cn } from '../../lib/cn'
import { isPastDate } from '../../lib/bookingRules'
import { to12h } from '../../lib/format'
import {
  SLOT_MINUTES,
  hhmmToMinutes,
  minutesToHHMM,
  resolveSlot,
} from '../../lib/time'
import type { AvailabilityBlock, Booking } from '../../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The visible day window. Outside this the grid would be mostly empty rows; childcare bookings
// cluster in the afternoon/evening, so we show 6am–10pm. Bookings outside it still render
// clamped to the edges (rare, and the detail modal shows the true time).
const DAY_START_MIN = 6 * 60 // 06:00
const DAY_END_MIN = 22 * 60 // 22:00
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN
const ROWS = TOTAL_MIN / SLOT_MINUTES // 15-min rows
const ROW_PX = 14 // height of one 15-min row; hour = 56px

// Default slot when a user opens a day via the keyboard button (no drag to read times from).
// Mirrors the family page's historical 15:00–20:00 default.
const DEFAULT_START = '15:00'
const DEFAULT_END = '20:00'

/**
 * Non-colour status signal, mirrored from MonthGrid so the two calendar surfaces teach the same
 * glyphs. Status must never rest on hue alone (WCAG 1.4.1) — on this platform the confirmed/open
 * distinction is "childcare is handled" vs "nobody is coming yet".
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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The seven ISO dates of the week beginning at weekStart. */
function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number)
  const base = new Date(y, (m ?? 1) - 1, d ?? 1)
  return Array.from({ length: 7 }, (_, i) => ymd(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)))
}

/** Pixel top/height for a [startMin,endMin) span, clamped to the visible window. */
function spanBox(startMin: number, endMin: number) {
  const top = Math.max(startMin, DAY_START_MIN)
  const bottom = Math.min(endMin, DAY_END_MIN)
  const px = (mins: number) => ((mins - DAY_START_MIN) / SLOT_MINUTES) * ROW_PX
  return { top: px(top), height: Math.max(ROW_PX, px(bottom) - px(top)) }
}

/**
 * Google-Calendar-style week view in Little Lamb's design language. Drag down a day column to
 * define a slot (snaps to 15 min, min 1 hour); on release it hands the slot up via onCreateSlot.
 * It never writes a booking — the page feeds the slot into the unchanged createBooking path.
 *
 * Shared by design: the props carry everything needed for the nanny availability view to reuse
 * this same grid later (labelWith + availability shading), but this session wires only the family
 * booking view.
 */
export function WeekGrid({
  weekStart,
  today,
  bookings,
  onCreateSlot,
  onPickBooking,
  availability,
  labelWith = 'nanny',
}: {
  weekStart: string // ISO date of the week's first day (Sunday)
  today: string
  bookings: Booking[]
  /** Fired on drag-release (and keyboard button) with the snapped slot. */
  onCreateSlot?: (date: string, startTime: string, endTime: string) => void
  onPickBooking?: (b: Booking) => void
  /** The selected nanny's weekly hours — shaded as a soft "usually free" cue (never a block). */
  availability?: AvailabilityBlock[]
  /** Whose name labels each booking: the nanny (family view) or the family (nanny view). */
  labelWith?: 'nanny' | 'family'
}) {
  const dates = weekDates(weekStart)

  // Bookings grouped by date (cancelled hidden, like MonthGrid).
  const byDate = new Map<string, Booking[]>()
  bookings.forEach((b) => {
    if (b.status === 'cancelled') return
    byDate.set(b.date, [...(byDate.get(b.date) ?? []), b])
  })

  // Drag state. anchor/hover are {date, min}; a drag is confined to the column it began in.
  const [anchor, setAnchor] = useState<{ date: string; min: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  function minForRow(row: number) {
    return DAY_START_MIN + row * SLOT_MINUTES
  }

  function startDrag(date: string, min: number) {
    setAnchor({ date, min })
    setHover(min)
  }

  function endDrag() {
    if (!anchor) return
    const a = anchor.min
    const b = hover ?? anchor.min
    setAnchor(null)
    setHover(null)
    const { startTime, endTime } = resolveSlot(a, b)
    onCreateSlot?.(anchor.date, startTime, endTime)
  }

  // Which rows are inside the dragged selection (for the live band).
  const selLo = anchor && hover !== null ? Math.min(anchor.min, hover) : null
  const selHi = anchor && hover !== null ? Math.max(anchor.min, hover) + SLOT_MINUTES : null

  // Hour label rows for the gutter.
  const hours: number[] = []
  for (let min = DAY_START_MIN; min < DAY_END_MIN; min += 60) hours.push(min)

  return (
    <div className="overflow-hidden rounded-ll-card border-1.5 border-ll-cream-dark bg-white shadow-soft">
      {/* Day header row */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-ll-cream-dark bg-ll-cream-dark">
        <div className="px-2 py-2" aria-hidden />
        {dates.map((date) => {
          const d = new Date(`${date}T00:00:00`)
          const isToday = date === today
          const past = isPastDate(date, today)
          return (
            <div key={date} className="flex flex-col items-center gap-1 px-1 py-2 text-center">
              <span className="font-mono text-mono-sm uppercase tracking-wide text-ll-warm-gray">
                {WEEKDAYS[d.getDay()]}
              </span>
              <span
                className={cn(
                  'inline-grid h-7 w-7 place-items-center rounded-full text-sm',
                  isToday ? 'bg-ll-ink font-bold text-ll-cream' : 'text-ll-ink',
                )}
              >
                {d.getDate()}
              </span>
              {/* Keyboard/a11y path: a per-day "new booking" button (drag is pointer-only). */}
              {!past && (
                <button
                  type="button"
                  data-new-booking={date}
                  onClick={() => onCreateSlot?.(date, DEFAULT_START, DEFAULT_END)}
                  aria-label={`New booking on ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                  className="grid h-6 w-6 place-items-center rounded-full border-1.5 border-ll-sage text-ll-sage-deep transition-colors hover:bg-ll-sage-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ll-sage"
                >
                  <span aria-hidden="true" className="text-sm leading-none">+</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="max-h-[32rem] overflow-y-auto">
        <div
          className="grid grid-cols-[3.5rem_repeat(7,1fr)]"
          // Any pointer leaving the grid or released off a cell ends the drag.
          onPointerLeave={() => anchor && endDrag()}
        >
          {/* Hour gutter */}
          <div className="relative" style={{ height: ROWS * ROW_PX }}>
            {hours.map((min) => (
              <div
                key={min}
                className="absolute right-1.5 -translate-y-1/2 font-mono text-[0.65rem] text-ll-warm-gray"
                style={{ top: ((min - DAY_START_MIN) / SLOT_MINUTES) * ROW_PX }}
              >
                {to12h(minutesToHHMM(min))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date) => {
            const past = isPastDate(date, today)
            const d = new Date(`${date}T00:00:00`)
            const dayBlocks = availability?.filter((a) => a.day === d.getDay()) ?? []
            const dayBookings = byDate.get(date) ?? []
            return (
              <div
                key={date}
                className={cn(
                  'relative border-l border-ll-cream-dark',
                  past && 'bg-ll-cream/60',
                )}
                style={{ height: ROWS * ROW_PX }}
              >
                {/* Availability shading — soft "usually free" cue for the selected nanny. */}
                {dayBlocks.map((b, i) => {
                  const box = spanBox(hhmmToMinutes(b.start), hhmmToMinutes(b.end))
                  return (
                    <div
                      key={i}
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bg-ll-sage-light/40"
                      style={{ top: box.top, height: box.height }}
                    />
                  )
                })}

                {/* Slot cells (drag targets). One per 15-min row. */}
                {Array.from({ length: ROWS }, (_, row) => {
                  const min = minForRow(row)
                  const inSel =
                    anchor?.date === date && selLo !== null && selHi !== null && min >= selLo && min < selHi
                  return (
                    <div
                      key={row}
                      data-slot-date={date}
                      data-slot-min={min}
                      onPointerDown={() => !past && startDrag(date, min)}
                      onPointerEnter={() => anchor?.date === date && setHover(min)}
                      onPointerUp={() => anchor && endDrag()}
                      className={cn(
                        'absolute inset-x-0',
                        !past && 'cursor-pointer hover:bg-ll-sage-light/30',
                        inSel && 'bg-ll-sage-light',
                        // A subtle hour divider every 4th row.
                        row % 4 === 0 && 'border-t border-ll-cream-dark',
                      )}
                      style={{ top: row * ROW_PX, height: ROW_PX }}
                    />
                  )
                })}

                {/* Existing booking blocks (above the slot cells, clickable). */}
                {dayBookings.map((b) => {
                  const box = spanBox(hhmmToMinutes(b.startTime), hhmmToMinutes(b.endTime))
                  const mark = statusMark(b.status)
                  const unclaimed = !b.nannyName && (b.status === 'open' || b.status === 'unmatched')
                  const named =
                    labelWith === 'family' ? (b.familyName ?? b.nannyName) : (b.nannyName ?? b.familyName)
                  const who = unclaimed ? 'Finding a nanny' : (named ?? 'Booking')
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onPickBooking?.(b)}
                      aria-label={`${mark.label}: ${who}, ${to12h(b.startTime)} to ${to12h(b.endTime)}`}
                      title={`${mark.label} — ${who}`}
                      className={cn(
                        'absolute inset-x-0.5 overflow-hidden rounded-ll-tag px-1.5 py-0.5 text-left text-[0.7rem] font-semibold',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ll-ink',
                        b.status === 'confirmed'
                          ? 'bg-ll-sage-light text-ll-sage-deep'
                          : 'bg-ll-terra-soft text-ll-ink',
                      )}
                      style={{ top: box.top, height: box.height }}
                    >
                      <span className="flex items-center gap-0.5">
                        <span aria-hidden="true" className="shrink-0 font-mono leading-none">{mark.glyph}</span>
                        <span className="truncate">{who}</span>
                      </span>
                      <span className="block truncate font-mono text-[0.6rem] font-normal opacity-80">
                        {to12h(b.startTime)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend + drag tip — mirrors MonthGrid, teaching the non-colour glyphs. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ll-cream-dark bg-ll-cream px-3 py-2 font-mono text-mono-sm text-ll-warm-gray">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full bg-confirmed text-[0.6rem] leading-none text-ll-ink">
            {STATUS_MARK.confirmed.glyph}
          </span>
          Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full bg-pending text-[0.6rem] leading-none text-ll-ink">
            {STATUS_MARK.open.glyph}
          </span>
          Open
        </span>
        {availability && availability.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-3.5 rounded bg-ll-sage-light/60" />
            Usually free
          </span>
        )}
        {onCreateSlot && <span className="ml-auto">Tip: drag down a day to pick a time</span>}
      </div>
    </div>
  )
}
