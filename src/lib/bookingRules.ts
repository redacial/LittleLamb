// Every time-based rule a booking is subject to, in one place.
//
// Pure + Firebase-free so it is fully unit-testable, following the src/lib/recurring.ts and
// src/lib/rates.ts precedent for domain logic.
//
// WHY THIS MODULE EXISTS. These rules were previously scattered — a same-day check in
// rates.ts, a 48h window inline in recurring.ts, and `today` re-derived independently at seven
// call sites — and two live bugs fell straight through the gaps:
//
//   1. Nothing anywhere tested `date < today`. resolveBookingStatus only compared for equality,
//      so a past date inside the nanny's hours resolved to 'confirmed' and emailed BOTH parties
//      a confirmation for childcare that had already not happened. It could also seed a
//      recurring weekly series anchored in the past, since resolveRecurring requires 'confirmed'.
//   2. `today` came from `new Date().toISOString().slice(0,10)` — UTC. After ~5pm Pacific that
//      is already tomorrow, so a genuine same-day booking skipped same_day_review and
//      auto-confirmed, in exactly the evening hours families book childcare.
//
// Dates are "YYYY-MM-DD" and times are zero-padded "HH:MM", so both compare correctly as plain
// strings — the convention already used by recurring.ts and rates.ts. Keep it.

import type { AvailabilityBlock } from '../types'

/**
 * Minimum notice for a booking to route normally. Inside this window a booking is still
 * allowed, but it goes to the job board for a nanny to claim rather than auto-confirming
 * against someone who may never see it in time.
 */
export const MIN_LEAD_HOURS = 24

/**
 * A family may cancel freely up to this many hours before the start. Inside it, the
 * cancellation is FLAGGED as late — protecting a nanny who has already turned down other work.
 * What Little Lamb does about a late cancel (fees, strikes, escalation) is a business decision
 * and deliberately lives outside this module.
 */
export const FREE_CANCEL_HOURS = 24

/** How far ahead the scheduled job looks for recurring bookings whose nanny dropped coverage. */
export const RECURRING_CANCEL_WINDOW_HOURS = 48

/**
 * Today's date in the USER'S timezone as "YYYY-MM-DD".
 *
 * Deliberately NOT toISOString(), which is UTC and silently rolls over mid-evening for anyone
 * west of Greenwich. Mirrors how formatDate() in ./format.ts already builds local dates.
 */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Is this booking date already gone? Today is NOT past — same-day booking is supported. */
export function isPastDate(date: string, today: string): boolean {
  return date < today
}

/** Local Date for a booking's start instant. */
function startInstant(date: string, startTime: string): Date {
  return new Date(`${date}T${startTime}:00`)
}

/** Hours from `now` until the booking starts. Negative once the start has passed. */
export function hoursUntil(date: string, startTime: string, now: Date): number {
  return (startInstant(date, startTime).getTime() - now.getTime()) / 3_600_000
}

export type BookingRefusal = 'past-date'

export interface BookingGuard {
  /** False means: do not create this booking at all. */
  ok: boolean
  /** Why it was refused, for the UI message. Null when ok. */
  refusal: BookingRefusal | null
  /**
   * Allowed, but starting inside MIN_LEAD_HOURS. The caller routes these to the job board
   * instead of auto-confirming. Reported, never enforced here — this module says what is
   * true about a booking, the caller decides what to do about it.
   */
  shortNotice: boolean
}

/**
 * May this booking be created at all, and does it need special routing?
 *
 * Separate from resolveBookingStatus on purpose: a past date is not a *status*, it is a refusal
 * to create, and BookingStatus has no 'rejected' member. Widening that union would ripple
 * through every consumer. This mirrors the RecurringRefusal pattern in ./recurring.ts.
 */
export function canBook(args: { date: string; startTime: string; now?: Date }): BookingGuard {
  const now = args.now ?? new Date()
  if (isPastDate(args.date, todayISO(now))) {
    return { ok: false, refusal: 'past-date', shortNotice: false }
  }
  return {
    ok: true,
    refusal: null,
    // <= so a start exactly on the boundary counts as short notice: at precisely 24h out we
    // would rather over-route to the job board than auto-confirm a booking nobody sees.
    shortNotice: hoursUntil(args.date, args.startTime, now) <= MIN_LEAD_HOURS,
  }
}

/** Is this cancellation inside the free window? Returns the FLAG only — no policy applied. */
export function isLateCancel(date: string, startTime: string, now: Date = new Date()): boolean {
  return hoursUntil(date, startTime, now) < FREE_CANCEL_HOURS
}

/** day-of-week 0-6 (0 = Sunday), matching AvailabilityBlock.day. */
function weekday(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

/**
 * Does the nanny have an availability block fully covering this weekday and time window?
 *
 * Extracted from FamilyCalendarPage, where the same expression existed TWICE — once in the
 * submit path and once for the live preview — so the two could disagree about the very
 * question the UI was previewing.
 */
export function isWithinAvailability(
  blocks: AvailabilityBlock[] | undefined,
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  if (!blocks?.length) return false
  const day = weekday(date)
  return blocks.some((b) => b.day === day && b.start <= startTime && b.end >= endTime)
}
