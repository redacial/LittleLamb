import { describe, it, expect } from 'vitest'
import {
  runRecurringAutoCancel,
  type RecurringJobBooking,
  type RecurringJobDeps,
} from './recurringCore'
import type { AvailabilityByNanny } from '../shared/recurring'
import type { NotificationEvent } from '../shared/notifications-events'

// Fixed "now" so the 48h window is deterministic.
const NOW = '2026-06-15T09:00:00'

function booking(over: Partial<RecurringJobBooking>): RecurringJobBooking {
  return {
    id: 'b1', familyId: 'f1', familyName: 'Fam', nannyId: 'n1', nannyName: 'Nan',
    date: '2026-06-15', startTime: '15:00', endTime: '20:00',
    address: 'addr', recurring: true, status: 'confirmed', ...over,
  }
}

interface Harness {
  deps: RecurringJobDeps
  cancelled: string[]
  mailed: NotificationEvent[]
  /** Every nannyId passed to getAvailability, in call order (duplicates = wasted reads). */
  availabilityReads: string[]
}

function harness(bookings: RecurringJobBooking[], avail: AvailabilityByNanny): Harness {
  const cancelled: string[] = []
  const mailed: NotificationEvent[] = []
  const availabilityReads: string[] = []
  return {
    cancelled,
    mailed,
    availabilityReads,
    deps: {
      nowISO: NOW,
      listCandidateBookings: async () => bookings,
      getAvailability: async (id) => {
        availabilityReads.push(id)
        return avail[id] ?? []
      },
      cancelBooking: async (id) => { cancelled.push(id) },
      enqueueMail: async (e) => { mailed.push(e) },
    },
  }
}

describe('runRecurringAutoCancel', () => {
  it('cancels + emails a recurring booking the nanny no longer covers (within 48h)', async () => {
    // 2026-06-15 is a Monday (day 1). Nanny has NO Monday availability -> conflict.
    const h = harness([booking({})], { n1: [] })
    const res = await runRecurringAutoCancel(h.deps)
    expect(res).toEqual({ scanned: 1, cancelled: 1 })
    expect(h.cancelled).toEqual(['b1'])
    expect(h.mailed).toHaveLength(1)
    expect(h.mailed[0].type).toBe('recurring_booking_auto_cancelled')
    expect(h.mailed[0].to).toBe('family+nanny')
  })

  it('leaves a still-covered booking alone', async () => {
    const day = new Date(`2026-06-15T00:00:00`).getDay()
    const h = harness([booking({})], { n1: [{ day, start: '14:00', end: '21:00' }] })
    const res = await runRecurringAutoCancel(h.deps)
    expect(res).toEqual({ scanned: 1, cancelled: 0 })
    expect(h.cancelled).toEqual([])
    expect(h.mailed).toEqual([])
  })

  it('ignores non-recurring and out-of-window bookings', async () => {
    const h = harness(
      [
        booking({ id: 'one-off', recurring: false }),
        booking({ id: 'far', date: '2026-07-01' }), // > 48h away
      ],
      { n1: [] },
    )
    const res = await runRecurringAutoCancel(h.deps)
    expect(res.cancelled).toBe(0)
    expect(h.cancelled).toEqual([])
  })

  it('reads availability once per unique nanny, not once per booking', async () => {
    // Cost guard: this job runs hourly, so one Firestore read per BOOKING would bill
    // ~N times more than one read per NANNY. runRecurringAutoCancel dedupes nannyIds
    // before fetching; this locks that in.
    const day = new Date(`2026-06-15T00:00:00`).getDay()
    const h = harness(
      [
        booking({ id: 'a1', nannyId: 'n1' }),
        booking({ id: 'a2', nannyId: 'n1' }),
        booking({ id: 'a3', nannyId: 'n1' }),
        booking({ id: 'b1', nannyId: 'n2' }),
        booking({ id: 'b2', nannyId: 'n2' }),
        booking({ id: 'c1', nannyId: null }), // unassigned -> no availability read at all
      ],
      { n1: [{ day, start: '14:00', end: '21:00' }], n2: [{ day, start: '14:00', end: '21:00' }] },
    )

    await runRecurringAutoCancel(h.deps)

    // 6 bookings, 2 distinct assigned nannies -> exactly 2 reads.
    expect(h.availabilityReads).toHaveLength(2)
    expect([...h.availabilityReads].sort()).toEqual(['n1', 'n2'])
    expect(new Set(h.availabilityReads).size).toBe(h.availabilityReads.length)
  })

  it('handles multiple nannies, cancelling only the conflicting one', async () => {
    const day = new Date(`2026-06-15T00:00:00`).getDay()
    const h = harness(
      [
        booking({ id: 'keep', nannyId: 'n1' }),
        booking({ id: 'drop', nannyId: 'n2' }),
      ],
      { n1: [{ day, start: '14:00', end: '21:00' }], n2: [] },
    )
    const res = await runRecurringAutoCancel(h.deps)
    expect(res).toEqual({ scanned: 2, cancelled: 1 })
    expect(h.cancelled).toEqual(['drop'])
  })
})

describe('runRecurringAutoCancel — reachability guards (recurring is now settable from the UI)', () => {
  const day = new Date('2026-06-15T00:00:00').getDay() // Monday = 1

  it('never auto-cancels a booking that is already cancelled, even if it reaches the core', async () => {
    // The candidate query filters these out, but a race between the query and a family
    // cancelling the same instance can slip one through. Cancelling twice would fire a
    // SECOND auto-cancel email for a booking the family already withdrew.
    const h = harness([booking({ id: 'gone', status: 'cancelled' })], { n1: [] })
    const res = await runRecurringAutoCancel(h.deps)
    expect(h.cancelled).toEqual([])
    expect(h.mailed).toEqual([])
    expect(res.cancelled).toBe(0)
  })

  it('does not auto-cancel a PENDING recurring request the nanny has not answered', async () => {
    // A pending booking is pending precisely BECAUSE it sits outside the nanny's hours.
    // Treating that as an "availability conflict" would auto-cancel every outstanding
    // request 48h out and email the family that the nanny "changed their availability" —
    // which never happened. Only confirmed bookings represent a slot the nanny agreed to.
    const h = harness([booking({ id: 'unanswered', status: 'pending' })], { n1: [] })
    const res = await runRecurringAutoCancel(h.deps)
    expect(h.cancelled).toEqual([])
    expect(h.mailed).toEqual([])
    expect(res.cancelled).toBe(0)
  })

  it('cancels only the conflicting instance, never sibling instances of the same series', async () => {
    // One doc per instance. Cancelling the Monday instance must leave the following
    // Monday's instance untouched — the family keeps the rest of the series.
    const h = harness(
      [
        booking({ id: 'inst-1', date: '2026-06-15', status: 'confirmed' }),
        booking({ id: 'inst-2', date: '2026-06-22', status: 'confirmed' }), // > 48h out
      ],
      { n1: [] },
    )
    const res = await runRecurringAutoCancel(h.deps)
    expect(h.cancelled).toEqual(['inst-1'])
    expect(res.cancelled).toBe(1)
  })

  it('emails exactly once per cancelled instance', async () => {
    const h = harness(
      [
        booking({ id: 'a', nannyId: 'n1' }),
        booking({ id: 'b', nannyId: 'n2' }),
      ],
      { n1: [], n2: [] },
    )
    await runRecurringAutoCancel(h.deps)
    expect(h.mailed).toHaveLength(2)
    expect(h.mailed.map((m) => m.bookingId).sort()).toEqual(['a', 'b'])
  })

  it('leaves a confirmed booking alone once the nanny still covers it', async () => {
    const h = harness([booking({ status: 'confirmed' })], {
      n1: [{ day, start: '14:00', end: '21:00' }],
    })
    const res = await runRecurringAutoCancel(h.deps)
    expect(res.cancelled).toBe(0)
  })
})
