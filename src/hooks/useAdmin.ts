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
import { notify, type NotificationEvent } from '../lib/notifications'
import type { UserDoc, Role, NannyStage } from '../types'

/** Fire-and-forget: a notification failure must never reject an admin write. */
function fireNotify(event: NotificationEvent) {
  notify(event).catch(() => {})
}

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

/**
 * A live admin list plus whether the read FAILED.
 *
 * Why `error` matters more here than anywhere else in the app: these hooks previously
 * degraded a permission error or outage to an empty array, which renders identically to
 * "nothing to do". An admin looking at an empty approvals queue would reasonably conclude
 * there are no pending applicants — while real people sit unreviewed. Callers must show a
 * distinct "couldn't load" state, never an empty state, when `error` is set.
 */
export interface AdminList<T> {
  items: T[]
  error: Error | null
}

/** Live failed-payment alerts for the admin dashboard/billing page. */
export function useBillingAlerts(): AdminList<BillingAlert> {
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    return onSnapshot(
      collection(db, 'billing_alerts'),
      (snap) => {
        setAlerts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BillingAlert, 'id'>) })))
        setError(null)
      },
      (err) => setError(err),
    )
  }, [])
  return { items: alerts, error }
}

/** Pending applications of a given role, live. */
export function usePendingApplications(role: Role): AdminList<UserDoc> {
  const [items, setItems] = useState<UserDoc[]>([])
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', role),
      where('approved', '==', false),
      where('status', '==', 'pending'),
    )
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => d.data() as UserDoc))
        setError(null)
      },
      (err) => setError(err),
    )
  }, [role])
  return { items, error }
}

/** All users of a role (any status) for the admin management tabs. */
export function useUsersByRole(role: Role) {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', role))
    return onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserDoc))
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
  }, [role])
  return { users, loading, error }
}

/** Every booking on the platform (admin Bookings page). */
export function useAllBookings(): AdminList<import('../types').Booking> {
  const [bookings, setBookings] = useState<import('../types').Booking[]>([])
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    return onSnapshot(
      collection(db, 'bookings'),
      (snap) => {
        setBookings(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as import('../types').Booking),
        )
        setError(null)
      },
      (err) => setError(err),
    )
  }, [])
  return { items: bookings, error }
}

export function useAdminActions() {
  // fullName + role come from the UserDoc the caller (AdminPeoplePage) already holds, so
  // the notification payload is built without an extra read. role is only 'family' | 'nanny'
  // here (admins are never approved/rejected through this UI).
  const approve = useCallback(async (uid: string, fullName: string, role: 'family' | 'nanny') => {
    await updateDoc(doc(db, 'users', uid), {
      approved: true,
      status: 'approved',
      updatedAt: serverTimestamp(),
    })
    fireNotify({ type: 'application_approved', to: role, userId: uid, fullName })
  }, [])

  const reject = useCallback(async (uid: string, fullName: string, role: 'family' | 'nanny') => {
    await updateDoc(doc(db, 'users', uid), {
      approved: false,
      status: 'rejected',
      updatedAt: serverTimestamp(),
    })
    fireNotify({ type: 'application_rejected', to: role, userId: uid, fullName })
  }, [])

  const advanceStage = useCallback(async (uid: string, stage: NannyStage, fullName: string) => {
    await updateDoc(doc(db, 'users', uid), { stage, updatedAt: serverTimestamp() })
    // Only nannies have application stages.
    fireNotify({ type: 'application_status_updated', to: 'nanny', userId: uid, fullName, stage })
  }, [])

  return { approve, reject, advanceStage }
}
