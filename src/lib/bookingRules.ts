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
 * Minimum notice for a booking to route normally (auto-confirm against a chosen nanny). Inside
 * this window a booking is still allowed, but it goes to the JOB BOARD for any nanny to claim
 * rather than auto-confirming against someone who may never see it in time.
 *
 * 25, not 24, ON PURPOSE — see FREE_CANCEL_HOURS. The one-hour gap between the two is a designed
 * property, not a coincidence: do NOT collapse them to the same value.
 */
export const MIN_LEAD_HOURS = 25

/**
 * A family may cancel freely up to this many hours before the start. Inside it, the cancellation
 * is FLAGGED as late and a full-pay fee is computed (see lateCancelFeeCents) — protecting a nanny
 * who has already turned down other work. What Little Lamb does about the fee (collect, waive for
 * a sick child, escalate) is a business decision handled off-platform; this module only computes
 * and flags it.
 *
 * The 1h gap below MIN_LEAD_HOURS is the point: a family that books at the earliest NORMAL moment
 * (exactly 25h out) still gets a full hour where they can cancel for free. Book exactly at 24h and
 * you'd be inside the late-cancel window the instant you confirmed.
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
    // Strictly < so a start EXACTLY at the boundary (25h out) routes normally — that is the
    // earliest-normal-booking case the 25h/24h gap is designed to protect (see MIN_LEAD_HOURS).
    // Anything closer than 25h is short notice and goes to the job board.
    shortNotice: hoursUntil(args.date, args.startTime, now) < MIN_LEAD_HOURS,
  }
}

/** Is this cancellation inside the free window? Returns the FLAG only — no policy applied. */
export function isLateCancel(date: string, startTime: string, now: Date = new Date()): boolean {
  return hoursUntil(date, startTime, now) < FREE_CANCEL_HOURS
}

/**
 * Full-pay fee (in cents) owed when a family cancels inside the free-cancel window.
 *
 * Full pay = the whole session (start→end hours) × the nanny's CURRENT floor rate. It is what the
 * family is warned about at cancel time and what admin sees; the platform does not charge it —
 * wages are settled off-platform, and Little Lamb waives it for extenuating circumstances.
 *
 * Returns 0 when the cancel is NOT late (nothing owed) or when no floor is known (nothing to
 * compute against) — callers can treat 0 as "no fee to show".
 */
export function lateCancelFeeCents(
  booking: { date: string; startTime: string; endTime: string },
  nannyFloorCents: number | undefined,
  now: Date = new Date(),
): number {
  if (!nannyFloorCents || nannyFloorCents <= 0) return 0
  if (!isLateCancel(booking.date, booking.startTime, now)) return 0
  const hours = sessionHours(booking.startTime, booking.endTime)
  if (hours <= 0) return 0
  return Math.round(hours * nannyFloorCents)
}

/** Length of a booking in hours, from zero-padded "HH:MM" start/end on the same day. */
function sessionHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em - (sh * 60 + sm)) / 60
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
