import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBookingActions, createBooking } from './useBookings'
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
const addDoc = vi.fn<[unknown, Record<string, unknown>], Promise<{ id: string }>>(() =>
  Promise.resolve({ id: 'new' }),
)

vi.mock('../lib/notifications', () => ({
  notify: (e: NotificationEvent) => notify(e),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: (ref: unknown, data: Record<string, unknown>) => addDoc(ref, data),
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
  addDoc.mockClear()
})

/** A new booking's input, minus the status under test. */
const newBooking = {
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: null,
  nannyName: null,
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

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

describe('useBookingActions().assignNanny — the family must be told a nanny is coming', () => {
  // BUG 5, the fifth dead call site. assignNanny bails on `if (!meta) return` before firing
  // open_booking_picked_up, and its only call site (NannyDashboard) omitted meta — so the
  // booking flipped to `confirmed` and the family heard nothing at all. On this path the
  // family never chose a nanny, so this email is the ONLY signal anyone is showing up.

  it('enqueues open_booking_picked_up to the family, stamped with the claiming nanny', async () => {
    const { result } = renderHook(() => useBookingActions())

    await result.current.assignNanny('b9', 'n2', 'Marisol', { ...meta, nannyId: null, nannyName: null })

    expect(soleEvent()).toMatchObject({
      type: 'open_booking_picked_up',
      to: 'family',
      bookingId: 'b9',
      familyId: 'f1',
      // The claim overwrites the (empty) nanny fields on the post — the family is told WHO.
      nannyId: 'n2',
      nannyName: 'Marisol',
      date: '2026-09-04',
      address: '5 Cliff Dr, Santa Barbara, CA',
    })
  })

  it('still writes the assignment when meta is missing, but that path emails nobody', async () => {
    // Documents the guard that made the bug silent: the Firestore write succeeds either way,
    // which is precisely why a missing email left no trace in the UI.
    const { result } = renderHook(() => useBookingActions())

    await result.current.assignNanny('b9', 'n2', 'Marisol')

    expect(updateDoc).toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })
})

describe('createBooking — same-day bookings are job-board posts, not an admin dead end', () => {
  // D66. `same_day_review` told the family "we're checking" via same_day_booking_outcome
  // (outcome: 'pending') and then routed to an admin banner with NO ACTION BUTTONS — so the
  // follow-up that promise implies could never be sent by anyone. A guaranteed dead end.
  //
  // Same-day is now a posting on the EXISTING nanny job board: any nanny can claim it, and
  // claiming it fires open_booking_picked_up to the family (see assignNanny above).
  //
  // The normalisation happens HERE rather than in resolveBookingStatus because the board is
  // defined by the stored `status` field: useOpenBookings queries status in ['open',
  // 'unmatched'], and firestore.rules grants a nanny read+update on a booking that is not
  // theirs by that same literal list. A `same_day_review` doc is unreadable and unclaimable
  // by a nanny at the RULES layer, so widening the client query alone would have produced
  // permission-denied, not a job board.

  /** The doc fields written to Firestore by the last createBooking call. */
  function written(): Record<string, unknown> {
    expect(addDoc).toHaveBeenCalledTimes(1)
    return addDoc.mock.calls[0][1]
  }

  it('stores a same-day booking as an `open` board post, not `same_day_review`', async () => {
    await createBooking({ ...newBooking, status: 'same_day_review' })

    // `open` is what both useOpenBookings and firestore.rules recognise as claimable.
    expect(written()).toMatchObject({ status: 'open' })
  })

  it('drops any nanny the family picked — same-day is claimed, not assigned', async () => {
    // A same-day request must not sit reserved against one nanny who may never see it;
    // it goes to the whole board. The family cannot pick a nanny for same-day (D66).
    await createBooking({ ...newBooking, nannyId: 'n1', nannyName: 'Priya', status: 'same_day_review' })

    expect(written()).toMatchObject({ status: 'open', nannyId: null, nannyName: null })
  })

  it('does NOT promise a same-day family a follow-up nobody can send', async () => {
    await createBooking({ ...newBooking, status: 'same_day_review' })

    expect(notify).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'same_day_booking_outcome' }),
    )
  })

  it('emails nobody on creation of a board post — the email comes when a nanny claims it', async () => {
    await createBooking({ ...newBooking, status: 'same_day_review' })

    expect(addDoc).toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('leaves a normal confirmed booking untouched', async () => {
    // Guard against the normalisation over-reaching: only same-day is rerouted.
    await createBooking({ ...newBooking, nannyId: 'n1', nannyName: 'Priya', status: 'confirmed' })

    expect(written()).toMatchObject({ status: 'confirmed', nannyId: 'n1' })
    expect(soleEvent()).toMatchObject({ type: 'booking_auto_confirmed' })
  })
})

// The write path had ZERO date validation. It sanitized address and notes and routed same-day,
// but never looked at `date` — so a past date reached Firestore and, if it fell inside the
// nanny's hours, arrived as `confirmed` and emailed both parties a confirmation for childcare
// that had already not happened. The grid guard is the courtesy; this is the correctness.
describe('createBooking — refuses a booking in the past', () => {
  const YESTERDAY = '2020-01-01' // safely past regardless of when the suite runs

  it('throws rather than writing a past-dated booking', async () => {
    await expect(createBooking({ ...newBooking, date: YESTERDAY, status: 'confirmed' })).rejects.toThrow(
      /past/i,
    )
  })

  it('writes nothing to Firestore when it refuses', async () => {
    await createBooking({ ...newBooking, date: YESTERDAY, status: 'confirmed' }).catch(() => {})
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('sends no email when it refuses — the bug emailed BOTH parties', async () => {
    await createBooking({ ...newBooking, date: YESTERDAY, status: 'confirmed' }).catch(() => {})
    expect(notify).not.toHaveBeenCalled()
  })

  it('still accepts a future booking', async () => {
    await expect(
      createBooking({ ...newBooking, date: '2099-01-01', status: 'confirmed' }),
    ).resolves.toBeTruthy()
    expect(addDoc).toHaveBeenCalledTimes(1)
  })
})
