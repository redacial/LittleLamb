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
import type { Booking, BookingStatus } from '../types'

/** Minimal booking fields the email stubs reference. Optional so existing callers don't break. */
type BookingMeta = Pick<
  Booking,
  'familyId' | 'familyName' | 'nannyId' | 'nannyName' | 'date' | 'startTime' | 'endTime' | 'address'
>

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

export async function createBooking(input: CreateBookingInput): Promise<string> {
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
  } else if (input.status === 'same_day_review') {
    fireNotify({ type: 'same_day_booking_outcome', to: 'family', outcome: 'pending', ...base })
  }
  // open/unmatched: no email until a nanny picks it up (see assignNanny).

  return ref.id
}

export function useBookingActions() {
  // `meta` is optional so existing callers (which pass only id+status) keep compiling.
  // When provided, the right automated-email stub fires for the transition.
  const setStatus = useCallback(
    async (id: string, status: BookingStatus, meta?: BookingMeta) => {
      await updateDoc(doc(db, 'bookings', id), { status })
      if (!meta) return
      const base = bookingPayload(id, meta)
      if (status === 'confirmed') {
        // Nanny accepted an out-of-hours request → confirm the family.
        fireNotify({ type: 'booking_request_accepted', to: 'family', ...base })
      } else if (status === 'cancelled') {
        // A cancellation notifies the other party (family cancel → nanny; nanny decline → family).
        fireNotify({ type: 'booking_cancelled_by_family', to: 'nanny', ...base })
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
