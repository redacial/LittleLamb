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
 * Same-day bookings are posted to the nanny job board rather than held for admin (D66).
 *
 * The old `same_day_review` route was a guaranteed dead end: it emailed the family
 * `same_day_booking_outcome` with outcome 'pending' ("we're checking") and then surfaced on an
 * admin banner that had NO action buttons — so the follow-up that promise implies could not be
 * sent by anybody. The family was told to wait, and then never heard back.
 *
 * The fix reuses machinery that already exists rather than building admin matchmaking: an
 * `open` booking is already rendered on the nanny dashboard as "Open bookings you can pick up"
 * with a working Accept button, and claiming it emails the family (see assignNanny).
 *
 * Why normalise the stored status here instead of widening useOpenBookings' query to include
 * 'same_day_review': the board is defined at the RULES layer, not just the client. firestore.rules
 * grants a nanny read AND update on a booking that isn't theirs only when
 * `status in ['open', 'unmatched']` — the same literal list the query uses. A `same_day_review`
 * doc is therefore unreadable and unclaimable by a nanny no matter what the client asks for, so
 * widening the query alone would have produced permission-denied rather than a job board. Mapping
 * to `open` keeps firestore.rules untouched and makes the post claimable for real.
 *
 * Admin still SEES same-day work: these posts appear in the dashboard's unmatched/open section,
 * which is what Lucy needs in order to email nannies about urgent posts off-platform. What she no
 * longer gets is a control implying the platform will route it for her.
 *
 * The nanny is also cleared: a same-day request must not sit reserved against one nanny who may
 * never open the app in time. Families do not pick a nanny for same-day — the board does.
 */
function routeSameDay(input: CreateBookingInput, shortNotice: boolean): CreateBookingInput {
  // Short notice is routed the same way, and for the same reason: inside MIN_LEAD_HOURS a
  // booking must not auto-confirm against a nanny who may never open the app in time. Only a
  // would-be `confirmed` booking is downgraded — `pending` already awaits a human, and an
  // open/unmatched post is already on the board.
  const needsBoard = input.status === 'same_day_review' || (shortNotice && input.status === 'confirmed')
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

  const input = routeSameDay(rawInput, guard.shortNotice)
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
  } else if (input.status === 'pending') {
    fireNotify({ type: 'booking_request_sent', to: 'family+nanny', ...base })
  }
  // open/unmatched (which now includes same-day): no email until a nanny picks it up. Staying
  // silent here is deliberate — the only same-day template says "we're checking and will let you
  // know", and nothing on the platform was ever going to send that follow-up. The family's real
  // confirmation is open_booking_picked_up, fired by assignNanny when a nanny claims the post.

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
  const assignNanny = useCallback(
    async (id: string, nannyId: string, nannyName: string, meta?: BookingMeta) => {
      await updateDoc(doc(db, 'bookings', id), { nannyId, nannyName, status: 'confirmed' })
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
  return { setStatus, assignNanny }
}
