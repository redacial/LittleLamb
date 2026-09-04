// Testable core of the recurring 48h auto-cancel job (CLAUDE.md §11.4), separated from
// Firestore/scheduler wiring so it unit-tests with injected fakes. The pure detection
// (which bookings conflict) is findRecurringConflicts in ../shared/recurring; this layer
// decides what to WRITE: cancel each conflicting booking and enqueue one
// recurring_booking_auto_cancelled email per booking.

import { findRecurringConflicts, type AvailabilityByNanny } from '../shared/recurring'
import type { NotificationEvent } from '../shared/notifications-events'

/** The booking fields this job reads + writes. */
export interface RecurringJobBooking {
  id: string
  familyId: string
  familyName: string
  nannyId: string | null
  nannyName: string | null
  date: string
  startTime: string
  endTime: string
  address: string
  recurring: boolean
  status: string
}

export interface RecurringJobDeps {
  /** Candidate bookings: recurring, future, not already cancelled. */
  listCandidateBookings(): Promise<RecurringJobBooking[]>
  /** Current availability for a nanny (empty if none). */
  getAvailability(nannyId: string): Promise<AvailabilityByNanny[string]>
  /** Mark a booking cancelled with the auto-cancel reason. */
  cancelBooking(id: string): Promise<void>
  /** Enqueue an outbound email (writes a `mail` doc). */
  enqueueMail(event: NotificationEvent): Promise<void>
  /** "now" as an ISO string (injected for testability). */
  nowISO: string
}

export interface RecurringJobResult {
  scanned: number
  cancelled: number
}

/** Build the auto-cancel notification payload for a conflicting booking. */
function cancelEvent(b: RecurringJobBooking): NotificationEvent {
  return {
    type: 'recurring_booking_auto_cancelled',
    to: 'family+nanny',
    bookingId: b.id,
    familyId: b.familyId,
    familyName: b.familyName,
    nannyId: b.nannyId,
    nannyName: b.nannyName,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    address: b.address,
  }
}

export async function runRecurringAutoCancel(deps: RecurringJobDeps): Promise<RecurringJobResult> {
  const bookings = await deps.listCandidateBookings()

  // Gather availability for every assigned nanny among candidates (deduped).
  const nannyIds = [...new Set(bookings.map((b) => b.nannyId).filter((id): id is string => !!id))]
  const availabilityByNanny: AvailabilityByNanny = {}
  for (const id of nannyIds) {
    availabilityByNanny[id] = await deps.getAvailability(id)
  }

  const conflicts = findRecurringConflicts(bookings, availabilityByNanny, deps.nowISO)

  let cancelled = 0
  for (const b of conflicts) {
    // Only a CONFIRMED booking represents a slot the nanny actually agreed to, and so is
    // the only kind that can be broken by the nanny later withdrawing that availability.
    //
    // An `open` booking sits on the job board with no committed nanny (out-of-hours, rate
    // mismatch, same-day, or short-notice — see resolveBookingStatus in src/lib/rates.ts), so
    // it represents no availability the nanny agreed to and must not be auto-cancelled. This
    // also subsumes the old `cancelled` guard: a booking already cancelled (by the family, or
    // by a previous overlapping run of this job) is not confirmed, so it can never be cancelled
    // or emailed twice. (The removed `pending` status used to be the main case here.)
    //
    // Unreachable until recurring became settable from the family calendar — exactly the
    // class of latent bug this project has shipped before.
    if (b.status !== 'confirmed') continue
    await deps.cancelBooking(b.id)
    await deps.enqueueMail(cancelEvent(b))
    cancelled++
  }

  return { scanned: bookings.length, cancelled }
}
