// Time-grid math for the week-view calendar. Pure helpers, no Date dependency: the calendar
// works entirely in "minutes past midnight" while dragging, and converts to/from the "HH:MM"
// strings the Booking model stores only at the edges.
//
// Snapping and the minimum duration live here (not in the grid component) so the drag UI, any
// manual time-input edit, and the tests all agree on one definition. Booking BUSINESS rules
// (lead time, job-board routing) stay in bookingRules.ts — this file is purely slot geometry.

/** One grid slot = 15 minutes. Drags snap to this; see resolveSlot. */
export const SLOT_MINUTES = 15

/** Minimum bookable duration (Backlog BK-2: min 1 hour). */
export const MIN_BOOKING_MINUTES = 60

/** "HH:MM" → minutes past midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Minutes past midnight → zero-padded "HH:MM". */
export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Round a minute value to the nearest 15-minute slot. */
export function snapTo15(mins: number): number {
  return Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES
}

/**
 * Turn a raw drag (two minute values, in either order) into a bookable slot:
 *  - order the ends so start ≤ end,
 *  - snap both to 15 minutes,
 *  - enforce the 1-hour minimum by extending the END (the anchored start is what the user
 *    pointed at, so we grow downward rather than move their chosen start time).
 */
export function resolveSlot(
  aMinutes: number,
  bMinutes: number,
): { startTime: string; endTime: string } {
  const lo = snapTo15(Math.min(aMinutes, bMinutes))
  let hi = snapTo15(Math.max(aMinutes, bMinutes))
  if (hi - lo < MIN_BOOKING_MINUTES) hi = lo + MIN_BOOKING_MINUTES
  return { startTime: minutesToHHMM(lo), endTime: minutesToHHMM(hi) }
}
