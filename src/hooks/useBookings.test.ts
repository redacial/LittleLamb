import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBookingActions } from './useBookings'
import type { NotificationEvent } from '../lib/notifications'

// D-BUG2/D-BUG3 regression suite.
//
// Two shipped bugs live in setStatus, and both are the exact failure mode CLAUDE.md's testing
// rule was written for: the code READ correctly and every existing test passed.
//
//   BUG 2 — setStatus bailed on `if (!meta) return` before firing anything, and all three
//           call sites omitted meta. Accepting, declining and admin-cancelling a booking sent
//           ZERO email. Silent: no error, no log, the status write succeeded.
//   BUG 3 — the `cancelled` branch unconditionally fired booking_cancelled_by_family addressed
//           `to: 'nanny'`. So a NANNY declining a request emailed the nanny about her own
//           decline and the family — the party who has to go rebook — was never told.
//
// These tests assert on the notification ENQUEUED, not on the Firestore write, because the
// enqueue is the thing that was missing. `notify` is the single delivery seam (see
// src/lib/notifications.ts), so spying there covers every downstream provider wiring.

const notify = vi.fn<[NotificationEvent], Promise<void>>(() => Promise.resolve())
const updateDoc = vi.fn(() => Promise.resolve())

vi.mock('../lib/notifications', () => ({
  notify: (e: NotificationEvent) => notify(e),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new' })),
  doc: vi.fn(() => ({})),
  updateDoc: (...a: unknown[]) => updateDoc(...(a as [])),
  serverTimestamp: vi.fn(() => 'ts'),
}))

vi.mock('../lib/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }))

const meta = {
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

/** The one notification enqueued by the action under test. Fails loudly when none fired. */
function soleEvent(): NotificationEvent {
  expect(notify).toHaveBeenCalledTimes(1)
  return notify.mock.calls[0][0]
}

beforeEach(() => {
  notify.mockClear()
  updateDoc.mockClear()
})

describe('useBookingActions().setStatus — who gets emailed when', () => {
  it('a nanny ACCEPTING a request confirms the FAMILY', async () => {
    const { result } = renderHook(() => useBookingActions())

    await result.current.setStatus('b1', 'confirmed', meta, 'nanny')

    expect(soleEvent()).toMatchObject({
      type: 'booking_request_accepted',
      to: 'family',
      bookingId: 'b1',
      familyId: 'f1',
      nannyName: 'Priya',
    })
  })

  it('a nanny DECLINING notifies the FAMILY with booking_request_declined — not the nanny', async () => {
    // BUG 3 proper. The nanny already knows she declined; the family is the one who has to
    // rebook. Emailing the nanny instead leaves the family waiting on a booking that is dead.
    const { result } = renderHook(() => useBookingActions())

    await result.current.setStatus('b1', 'cancelled', meta, 'nanny')

    const e = soleEvent()
    expect(e.type).toBe('booking_request_declined')
    expect(e).toMatchObject({ to: 'family' })
    expect(e.type).not.toBe('booking_cancelled_by_family')
  })

  it('a FAMILY cancelling still notifies the NANNY (unchanged behaviour)', async () => {
    const { result } = renderHook(() => useBookingActions())

    await result.current.setStatus('b1', 'cancelled', meta, 'family')

    expect(soleEvent()).toMatchObject({ type: 'booking_cancelled_by_family', to: 'nanny' })
  })

  it('an ADMIN cancelling notifies the NANNY so their calendar hold is withdrawn', async () => {
    const { result } = renderHook(() => useBookingActions())

    await result.current.setStatus('b1', 'cancelled', meta, 'admin')

    expect(soleEvent()).toMatchObject({ type: 'booking_cancelled_by_family', to: 'nanny' })
  })

  it('defaults to the family-cancel behaviour when no actor is given', async () => {
    // Back-compat: src/pages/shared/BookingsPage.tsx passes a 2-arg (id, status) callback.
    const { result } = renderHook(() => useBookingActions())

    await result.current.setStatus('b1', 'cancelled', meta)

    expect(soleEvent()).toMatchObject({ type: 'booking_cancelled_by_family', to: 'nanny' })
  })
})
