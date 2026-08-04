// COPY of the pure findRecurringConflicts from ../../../src/lib/recurring.ts.
//
// Kept identical to the client original (which has 5 vitest cases). This package
// can't cross-import the client module (Vite vs Node tsconfig), and the function is
// pure, so it is copied. The Booking/AvailabilityBlock shapes are narrowed to the
// fields this rule actually reads, so the copy stays free of the client's
// firebase/firestore Timestamp import.
//
// CLAUDE.md §11.4: a recurring booking whose nanny dropped covering availability AND
// starts within 48h must be auto-cancelled. This is ONLY the pure detection step —
// the scheduled execution lives in ../scheduled/recurringAutoCancel.ts.

/** Weekly availability block (mirror of src/types AvailabilityBlock). */
export interface AvailabilityBlock {
  day: number // 0-6, 0 = Sunday
  start: string // "15:00"
  end: string // "20:00"
}

/** The booking fields this rule reads. A superset (e.g. a full Booking) is accepted. */
export interface RecurringBooking {
  id: string
  nannyId: string | null
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  recurring: boolean
}

/** Map of nannyId -> that nanny's current weekly availability blocks. */
export type AvailabilityByNanny = Record<string, AvailabilityBlock[]>

/** Parse "YYYY-MM-DD" + "HH:MM" into an absolute Date in local time. */
function toDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

/** day-of-week 0-6 (0 = Sunday), matching AvailabilityBlock.day. */
function weekday(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

/**
 * Does this nanny still have an availability block fully covering the booking's
 * weekday + start/end window? Times compare lexically because they are zero-padded "HH:MM".
 */
function isCovered(booking: RecurringBooking, blocks: AvailabilityBlock[]): boolean {
  const day = weekday(booking.date)
  return blocks.some(
    (b) => b.day === day && b.start <= booking.startTime && b.end >= booking.endTime,
  )
}

/**
 * Returns the recurring bookings that must be auto-cancelled: their assigned nanny no
 * longer has availability covering the slot AND the booking starts within the next 48h.
 *
 * Pure — no side effects. The caller cancels and notifies.
 *
 * @param bookings            all candidate bookings to evaluate
 * @param availabilityByNanny each nanny's CURRENT weekly availability
 * @param nowISO              "now" as an ISO timestamp (injected for testability)
 */
export function findRecurringConflicts<T extends RecurringBooking>(
  bookings: T[],
  availabilityByNanny: AvailabilityByNanny,
  nowISO: string,
): T[] {
  const now = new Date(nowISO).getTime()
  const horizon = now + 48 * 60 * 60 * 1000 // 48 hours from now

  return bookings.filter((booking) => {
    if (!booking.recurring) return false
    if (!booking.nannyId) return false

    const startMs = toDate(booking.date, booking.startTime).getTime()
    if (startMs < now || startMs > horizon) return false

    const blocks = availabilityByNanny[booking.nannyId] ?? []
    return !isCovered(booking, blocks)
  })
}
