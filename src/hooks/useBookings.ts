// Booking data hooks. All Firestore booking access lives here (CLAUDE.md architecture).
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanLine, cleanText } from '../lib/sanitize'
import { notify, type NotificationEvent } from '../lib/notifications'
import { canBook } from '../lib/bookingRules'
import type { Booking, BookingStatus } from '../types'

/** Minimal booking fields the email stubs reference. Optional so existing callers don't break. */
type BookingMeta = Pick<
  Booking,
  'familyId' | 'familyName' | 'nannyId' | 'nannyName' | 'date' | 'startTime' | 'endTime' | 'address'
>

/**
 * Who initiated a status change. A 'cancelled' transition means a different thing — and emails a
 * different party — depending on which side clicked, so the caller must say. See setStatus.
 */
export type BookingActor = 'family' | 'nanny' | 'admin'

/** Build the shared booking payload the notification events expect. */
function bookingPayload(id: string, m: BookingMeta) {
  return {
    bookingId: id,
    familyId: m.familyId,
    familyName: m.familyName,
    nannyId: m.nannyId,
    nannyName: m.nannyName,
    date: m.date,
    startTime: m.startTime,
    endTime: m.endTime,
    address: m.address,
  }
}

/** Fire-and-forget: a notification failure must never reject a booking write. */
function fireNotify(event: NotificationEvent) {
  notify(event).catch(() => {})
}

function mapSnap(docs: { id: string; data: () => Record<string, unknown> }[]): Booking[] {
  return docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
}

/** Live bookings for a family (their own) or nanny (assigned to them). */
export function useMyBookings(uid: string | undefined, role: 'family' | 'nanny') {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const field = role === 'family' ? 'familyId' : 'nannyId'
    const q = query(collection(db, 'bookings'), where(field, '==', uid), orderBy('date', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(mapSnap(snap.docs))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [uid, role])

  return { bookings, loading }
}

/** Open/unmatched bookings a nanny could pick up. */
export function useOpenBookings() {
  const [open, setOpen] = useState<Booking[]>([])
  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('status', 'in', ['open', 'unmatched']))
    return onSnapshot(q, (snap) => setOpen(mapSnap(snap.docs)), () => setOpen([]))
  }, [])
  return open
}

export interface CreateBookingInput {
  familyId: string
  familyName: string
  nannyId: string | null
  nannyName: string | null
  date: string
  startTime: string
  endTime: string
  address: string
  notes?: string
  status: BookingStatus
  recurring?: boolean
  /**
   * Rate agreed at booking time, in cents — snapshotted so a later profile edit can't
   * rewrite history. Omitted when neither side has set a range (and by admin override).
   * Spread straight through to the doc below; firestore.rules validates the bounds.
   */
  rateMinCents?: number
  rateMaxCents?: number
  rateAgreed?: boolean
}

/**
 * Route a new booking to its final stored status, clearing any nanny off a board post.
 *
 * The model (partner meeting 2026-09): a booking auto-confirms ONLY when it lands inside the
 * chosen nanny's set hours, the rates overlap, it isn't same-day (all decided already by
 * resolveBookingStatus → 'confirmed'), AND it is at least MIN_LEAD_HOURS out. Everything else —
 * an already-'open' post from resolveBookingStatus, OR a 'confirmed' booking that is short-notice
 * (<25h) — goes to the JOB BOARD as an 'open' post any nanny can claim.
 *
 * The pending/accept-decline concept is gone: there is no out-of-hours request a specific nanny
 * accepts. Out-of-hours, rate-mismatch, same-day, and short-notice all resolve to the board.
 *
 * Why the board is defined by the stored `status`: useOpenBookings queries status in
 * ['open','unmatched'], and firestore.rules grants a nanny read AND update on a booking that
 * isn't theirs only for that same literal list. So the post must actually be stored 'open' to be
 * claimable — and any nanny the family picked is cleared, because a board post must not sit
 * reserved against one nanny who may never open the app in time.
 */
function routeBooking(input: CreateBookingInput, shortNotice: boolean): CreateBookingInput {
  // A would-be confirmed booking inside the lead window can't auto-confirm against a nanny who
  // may never see it in time — send it to the board. An already-'open' post is board-bound by
  // definition; normalise it so its nanny fields are cleared here in one place.
  const needsBoard = input.status === 'open' || input.status === 'unmatched' || (shortNotice && input.status === 'confirmed')
  if (!needsBoard) return input
  return { ...input, status: 'open', nannyId: null, nannyName: null }
}

export async function createBooking(rawInput: CreateBookingInput): Promise<string> {
  // Defence in depth. The calendar already refuses to open a past day, but this is the only
  // client path that writes a booking, so it validates independently — a UI regression, a
  // stale tab, or an admin flow must not be able to create a booking in the past. Throwing
  // (rather than silently returning) keeps callers honest: they must handle it.
  const guard = canBook({ date: rawInput.date, startTime: rawInput.startTime })
  if (!guard.ok) {
    throw new Error(`Cannot book ${rawInput.date}: that date is in the past.`)
  }

  const input = routeBooking(rawInput, guard.shortNotice)
  const address = cleanLine(input.address, 300)
  const ref = await addDoc(collection(db, 'bookings'), {
    ...input,
    address,
    notes: cleanText(input.notes ?? '', 1000),
    recurring: input.recurring ?? false,
    recurrenceId: null,
    createdAt: serverTimestamp(),
  })

  // Fire the matching automated-email stub for the booking outcome (CLAUDE.md §11.1 / Part 19).
  const base = bookingPayload(ref.id, { ...input, address })
  if (input.status === 'confirmed') {
    fireNotify({ type: 'booking_auto_confirmed', to: 'family+nanny', ...base })
  }
  // open/unmatched (out-of-hours, rate mismatch, same-day, short-notice): no email until a nanny
  // claims it. Staying silent here is deliberate — the family's real confirmation is
  // open_booking_picked_up, fired by assignNanny when a nanny claims the post. The old
  // booking_request_sent email belonged to the removed pending/accept-decline flow.

  return ref.id
}

export function useBookingActions() {
  // `meta` is optional so existing callers (which pass only id+status) keep compiling.
  // When provided, the right automated-email stub fires for the transition.
  //
  // `actor` says WHO drove the transition, because 'cancelled' is not one event — it is three
  // different emails to two different people depending on who clicked. Deriving it from the
  // signed-in user's role was rejected: an admin acts on bookings they are not party to, so the
  // caller's role and the booking's parties are unrelated, and the page that owns the button is
  // the only place that reliably knows the intent. Defaults to 'family' — the historical
  // behaviour — so the 2-arg callback in src/pages/shared/BookingsPage.tsx (family cancel) keeps
  // working untouched.
  const setStatus = useCallback(
    async (id: string, status: BookingStatus, meta?: BookingMeta, actor: BookingActor = 'family') => {
      await updateDoc(doc(db, 'bookings', id), { status })
      if (!meta) return
      const base = bookingPayload(id, meta)
      if (status === 'confirmed') {
        // Nanny accepted an out-of-hours request → confirm the family.
        fireNotify({ type: 'booking_request_accepted', to: 'family', ...base })
      } else if (status === 'cancelled') {
        if (actor === 'nanny') {
          // Nanny declined the request. The nanny already knows; the FAMILY is the one who has
          // to go rebook, so they are the recipient (CLAUDE.md Part 19, "Nanny declines booking
          // request → Family"). Emailing the nanny here was the shipped bug.
          fireNotify({ type: 'booking_request_declined', to: 'family', ...base })
        } else {
          // Family cancel, and admin override cancel, both withdraw a booking the NANNY is
          // holding — so both send the nanny the cancellation notice, which is the only
          // cancellation template carrying a CANCEL iCal to clear their calendar hold. Its copy
          // ("a booking assigned to you was cancelled") is actor-neutral and reads correctly for
          // an admin override too. The family is deliberately NOT emailed on an admin cancel:
          // the only family-facing cancellation template asserts the nanny couldn't take the
          // booking, which is false for an override, and CLAUDE.md has no admin-cancel row —
          // admin cancels are coordinated with the family off-platform (Part 20 / §7.3).
          fireNotify({ type: 'booking_cancelled_by_family', to: 'nanny', ...base })
        }
      }
    },
    [],
  )
  /**
   * A nanny claims an open job-board post.
   *
   * TRANSACTIONAL BY NECESSITY. This was a blind updateDoc: two nannies looking at the same open
   * post both tapped Accept, both writes succeeded, and last-write-wins silently unassigned the
   * first nanny from a job she believed she had. She would show up, or the family would get a
   * different person, or nobody. The claim has to be atomic — read the booking and only take it
   * if it is still unclaimed — which is the same claim-then-act shape the Stripe webhook uses.
   *
   * It THROWS on a lost race rather than resolving quietly, so the caller is forced to tell her.
   */
  const assignNanny = useCallback(
    async (id: string, nannyId: string, nannyName: string, meta?: BookingMeta) => {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'bookings', id)
        const snap = await tx.get(ref)
        if (!snap.exists()) {
          throw new Error('That booking is no longer available.')
        }
        const current = snap.data() as { status?: string; nannyId?: string | null }
        // Only an unclaimed post is claimable. Anything else — already confirmed, cancelled, or
        // assigned to someone else — means we lost, and the UI must say so.
        if (current.status !== 'open' && current.status !== 'unmatched') {
          throw new Error('Another nanny just claimed this booking.')
        }
        if (current.nannyId && current.nannyId !== nannyId) {
          throw new Error('Another nanny just claimed this booking.')
        }
        tx.update(ref, { nannyId, nannyName, status: 'confirmed' })
      })

      // Only reached when the claim actually landed, so the family is never told twice.
      if (!meta) return
      // Open/unmatched booking picked up by a nanny → confirm the family (CLAUDE.md §11.3).
      fireNotify({
        type: 'open_booking_picked_up',
        to: 'family',
        ...bookingPayload(id, { ...meta, nannyId, nannyName }),
      })
    },
    [],
  )

  /**
   * A FAMILY cancels one of its own bookings (the only in-app cancel path — nannies cannot cancel;
   * they email/text Little Lamb, and admin cancels through the admin bookings page).
   *
   * Records the late-cancel outcome ON the booking: `lateCancel` + `lateCancelFeeCents` (full pay
   * due to the nanny when the cancel is inside the free window) + `cancelledAt`. The fee is
   * DISPLAYED and RECORDED only — the platform doesn't charge it; Little Lamb settles or waives it
   * off-platform (admin has a waive toggle). Emails the nanny the cancellation notice (with its
   * CANCEL iCal) exactly as before.
   */
  const cancelBooking = useCallback(async (id: string, booking: BookingMeta, feeCents: number) => {
    const late = feeCents > 0
    await updateDoc(doc(db, 'bookings', id), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      lateCancel: late,
      // Store the fee only when there is one, so a free cancel doesn't carry a misleading 0.
      ...(late ? { lateCancelFeeCents: feeCents } : {}),
    })
    fireNotify({ type: 'booking_cancelled_by_family', to: 'nanny', ...bookingPayload(id, booking) })
  }, [])

  /** Admin waives (or un-waives) the late-cancel fee for extenuating circumstances. */
  const setLateCancelWaived = useCallback(async (id: string, waived: boolean) => {
    await updateDoc(doc(db, 'bookings', id), { lateCancelWaived: waived })
  }, [])

  return { setStatus, assignNanny, cancelBooking, setLateCancelWaived }
}
