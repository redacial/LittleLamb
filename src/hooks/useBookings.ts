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
import type { Booking, BookingStatus } from '../types'

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
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  const ref = await addDoc(collection(db, 'bookings'), {
    ...input,
    address: cleanLine(input.address, 300),
    notes: cleanText(input.notes ?? '', 1000),
    recurring: input.recurring ?? false,
    recurrenceId: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function useBookingActions() {
  const setStatus = useCallback(async (id: string, status: BookingStatus) => {
    await updateDoc(doc(db, 'bookings', id), { status })
  }, [])
  const assignNanny = useCallback(async (id: string, nannyId: string, nannyName: string) => {
    await updateDoc(doc(db, 'bookings', id), { nannyId, nannyName, status: 'confirmed' })
  }, [])
  return { setStatus, assignNanny }
}
