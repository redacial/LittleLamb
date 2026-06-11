// Pure detection logic for the recurring-booking 48h auto-cancel rule (CLAUDE.md §11.4):
// "If nanny changes availability conflicting with a recurring booking, the system detects
//  48 hours in advance → auto-cancels that instance → both family and nanny notified."
//
// This file contains ONLY the pure detection step (no Firebase, no I/O) so it can be unit
// tested. The actual scheduled execution — running this on a cron / Firebase Cloud Function,
// then writing the cancellation and firing notify(recurring_booking_auto_cancelled) — is
// DEFERRED and lives outside this module.

import type { AvailabilityBlock, Booking } from '../types'

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
function isCovered(booking: Booking, blocks: AvailabilityBlock[]): boolean {
  const day = weekday(booking.date)
  return blocks.some(
    (b) => b.day === day && b.start <= booking.startTime && b.end >= booking.endTime,
  )
}

/**
 * Returns the recurring bookings that must be auto-cancelled: their assigned nanny no longer
 * has availability covering the slot AND the booking starts within the next 48 hours.
 *
 * Pure — no side effects. The caller is responsible for actually cancelling and notifying.
 *
 * @param bookings            all candidate bookings to evaluate
 * @param availabilityByNanny each nanny's CURRENT weekly availability
 * @param nowISO              "now" as an ISO timestamp (injected for testability)
 */
export function findRecurringConflicts(
  bookings: Booking[],
  availabilityByNanny: AvailabilityByNanny,
  nowISO: string,
): Booking[] {
  const now = new Date(nowISO).getTime()
  const horizon = now + 48 * 60 * 60 * 1000 // 48 hours from now

  return bookings.filter((booking) => {
    // Only recurring bookings with an assigned nanny are subject to this rule.
    if (!booking.recurring) return false
    if (!booking.nannyId) return false

    // Within the next 48h (and not already in the past).
    const startMs = toDate(booking.date, booking.startTime).getTime()
    if (startMs < now || startMs > horizon) return false

    // Conflict = the assigned nanny's current availability no longer covers the slot.
    const blocks = availabilityByNanny[booking.nannyId] ?? []
    return !isCovered(booking, blocks)
  })
}
