// Admin data hooks — platform-wide reads/writes. Gated by Firestore rules (admin-only).
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserDoc, Role, NannyStage } from '../types'

/** Pending applications of a given role, live. */
export function usePendingApplications(role: Role) {
  const [items, setItems] = useState<UserDoc[]>([])
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', role),
      where('approved', '==', false),
      where('status', '==', 'pending'),
    )
    return onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => d.data() as UserDoc)),
      () => setItems([]),
    )
  }, [role])
  return items
}

/** All users of a role (any status) for the admin management tabs. */
export function useUsersByRole(role: Role) {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', role))
    return onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [role])
  return { users, loading }
}

/** Every booking on the platform (admin Bookings page). */
export function useAllBookings() {
  const [bookings, setBookings] = useState<import('../types').Booking[]>([])
  useEffect(() => {
    return onSnapshot(
      collection(db, 'bookings'),
      (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as import('../types').Booking)),
      () => setBookings([]),
    )
  }, [])
  return bookings
}

export function useAdminActions() {
  const approve = useCallback(async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), {
      approved: true,
      status: 'approved',
      updatedAt: serverTimestamp(),
    })
  }, [])

  const reject = useCallback(async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), {
      approved: false,
      status: 'rejected',
      updatedAt: serverTimestamp(),
    })
  }, [])

  const advanceStage = useCallback(async (uid: string, stage: NannyStage) => {
    await updateDoc(doc(db, 'users', uid), { stage, updatedAt: serverTimestamp() })
  }, [])

  return { approve, reject, advanceStage }
}
