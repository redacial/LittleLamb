// Admin data hooks — platform-wide reads/writes. Gated by Firestore rules (admin-only).
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserDoc, Role, NannyStage } from '../types'

/** Billing rates + enable flag, stored in config/billing (dollars in the UI, cents on the server). */
export interface BillingConfig {
  subscriptionCents: number
  perBookingCents: number
  /** When false (default), the quarterly charge dry-runs — computes + writes invoices but never charges. */
  enabled: boolean
}

const BILLING_CONFIG_DEFAULT: BillingConfig = {
  subscriptionCents: 2500,
  perBookingCents: 100,
  enabled: false,
}

/** Live read of the billing config doc, with sensible defaults if it doesn't exist yet. */
export function useBillingConfig() {
  const [config, setConfig] = useState<BillingConfig>(BILLING_CONFIG_DEFAULT)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    return onSnapshot(
      doc(db, 'config', 'billing'),
      (snap) => {
        const d = snap.data()
        setConfig({
          subscriptionCents:
            typeof d?.subscriptionCents === 'number' ? d.subscriptionCents : BILLING_CONFIG_DEFAULT.subscriptionCents,
          perBookingCents:
            typeof d?.perBookingCents === 'number' ? d.perBookingCents : BILLING_CONFIG_DEFAULT.perBookingCents,
          enabled: d?.enabled === true,
        })
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [])

  const save = useCallback(async (next: Partial<BillingConfig>) => {
    await setDoc(doc(db, 'config', 'billing'), { ...next, updatedAt: serverTimestamp() }, { merge: true })
  }, [])

  return { config, loading, save }
}

/** A server-written failed-payment flag (billing_alerts), admin-read-only. */
export interface BillingAlert {
  id: string
  familyId: string
  familyName?: string
  invoiceId?: string | null
  amountCents?: number
  reason?: string
}

/** Live failed-payment alerts for the admin dashboard/billing page. */
export function useBillingAlerts() {
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  useEffect(() => {
    return onSnapshot(
      collection(db, 'billing_alerts'),
      (snap) => setAlerts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BillingAlert, 'id'>) }))),
      () => setAlerts([]),
    )
  }, [])
  return alerts
}

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
