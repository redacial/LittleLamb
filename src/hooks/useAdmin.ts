// Admin data hooks — platform-wide reads/writes. Gated by Firestore rules (admin-only).
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { notify, type NotificationEvent } from '../lib/notifications'
import { useGrowingCollection, type GrowingList } from './useGrowingCollection'
import type { UserDoc, Role, NannyStage, Booking } from '../types'

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
export type AdminList<T> = GrowingList<T>

/**
 * Page size for admin lists.
 *
 * These are live `onSnapshot` listeners over collections that grow forever, and several
 * mount on four different admin pages at once — unbounded, every booking ever made is
 * re-downloaded on every write.
 *
 * Now that `useGrowingCollection` provides a real "load more", this is a first-page size
 * rather than a hard ceiling, so it is deliberately much smaller than the old cap of 200:
 * 50 fills an admin screen, and the common case (one page, nobody clicks) reads a quarter
 * of what it used to on every single write.
 */
export const ADMIN_PAGE_SIZE = 50

// Doc mappers live at module scope because useGrowingCollection takes them as an effect
// dependency — an inline arrow would be a new function every render and re-subscribe the
// listener each time.
const mapAlert = (d: QueryDocumentSnapshot<DocumentData>): BillingAlert => ({
  id: d.id,
  ...(d.data() as Omit<BillingAlert, 'id'>),
})
const mapUser = (d: QueryDocumentSnapshot<DocumentData>) => d.data() as UserDoc
const mapBooking = (d: QueryDocumentSnapshot<DocumentData>) =>
  ({ id: d.id, ...(d.data() as object) }) as Booking

/** Live failed-payment alerts for the admin dashboard/billing page. */
export function useBillingAlerts(): GrowingList<BillingAlert> {
  // Newest first: a failed payment from today matters more than one from last quarter.
  const buildQuery = useCallback(
    (n: number) => query(collection(db, 'billing_alerts'), orderBy('createdAt', 'desc'), limit(n)),
    [],
  )
  return useGrowingCollection(buildQuery, mapAlert, ADMIN_PAGE_SIZE)
}

/** A mail doc that never reached the provider — see useUndeliveredMail. */
export interface UndeliveredMail {
  id: string
  status: 'error' | 'quota_exceeded'
  error?: string
  createdBy?: string
  event?: { type?: string }
}

const mapMail = (d: QueryDocumentSnapshot<DocumentData>): UndeliveredMail => ({
  id: d.id,
  ...(d.data() as Omit<UndeliveredMail, 'id'>),
})

/**
 * Mail that was enqueued but never sent — either the provider rejected it (`error`) or the
 * sender hit their daily cap (`quota_exceeded`).
 *
 * Both states are TERMINAL and were previously invisible: the doc is marked and never
 * retried, and nothing surfaced it. So a legitimate user tripping the 100/day cap, or a
 * Resend outage, looked exactly like mail being delivered — an admin would find out when
 * someone complained they never got their booking confirmation, if at all.
 *
 * No orderBy: `status in [...]` plus a sort would need a new composite index, and this list
 * is a small exception queue rather than a feed.
 */
export function useUndeliveredMail(): GrowingList<UndeliveredMail> {
  const buildQuery = useCallback(
    (n: number) =>
      query(collection(db, 'mail'), where('status', 'in', ['error', 'quota_exceeded']), limit(n)),
    [],
  )
  return useGrowingCollection(buildQuery, mapMail, ADMIN_PAGE_SIZE)
}

/** Pending applications of a given role, live. */
export function usePendingApplications(role: Role): GrowingList<UserDoc> {
  // No orderBy: the existing (role, approved, status) composite index covers this
  // equality-only query, and adding a sort field would require a new index.
  const buildQuery = useCallback(
    (n: number) =>
      query(
        collection(db, 'users'),
        where('role', '==', role),
        where('approved', '==', false),
        where('status', '==', 'pending'),
        limit(n),
      ),
    [role],
  )
  return useGrowingCollection(buildQuery, mapUser, ADMIN_PAGE_SIZE)
}

/**
 * All users of a role (any status) for the admin management tabs.
 *
 * Returns `users` alongside the standard `items` purely for source compatibility — five
 * call sites across four pages already destructure `users`, and renaming them would be
 * churn for no behavioural gain.
 */
export function useUsersByRole(role: Role): GrowingList<UserDoc> & { users: UserDoc[] } {
  const buildQuery = useCallback(
    (n: number) => query(collection(db, 'users'), where('role', '==', role), limit(n)),
    [role],
  )
  const growing = useGrowingCollection(buildQuery, mapUser, ADMIN_PAGE_SIZE)
  return { ...growing, users: growing.items }
}

/** Every booking on the platform (admin Bookings page). */
export function useAllBookings(): GrowingList<Booking> {
  // Newest first — every admin surface (dashboard queue, bookings list, billing,
  // analytics) cares about recent activity, so the most recent N is the right slice.
  // `date` is already indexed on this collection.
  const buildQuery = useCallback(
    (n: number) => query(collection(db, 'bookings'), orderBy('date', 'desc'), limit(n)),
    [],
  )
  return useGrowingCollection(buildQuery, mapBooking, ADMIN_PAGE_SIZE)
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
