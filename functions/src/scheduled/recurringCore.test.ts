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
}

function harness(bookings: RecurringJobBooking[], avail: AvailabilityByNanny): Harness {
  const cancelled: string[] = []
  const mailed: NotificationEvent[] = []
  return {
    cancelled,
    mailed,
    deps: {
      nowISO: NOW,
      listCandidateBookings: async () => bookings,
      getAvailability: async (id) => avail[id] ?? [],
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
