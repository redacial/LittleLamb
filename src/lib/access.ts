// Pure mirrors of the Firestore booking access rule, used in the UI to decide which actions to
// show AND unit-tested to document the intended authorization. The rules in firestore.rules are
// the real enforcement boundary; these must stay in agreement with them.
import type { Booking, Role } from '../types'

export interface Viewer {
  uid: string
  role: Role
}

/** Mirrors the bookings `read` rule: who may see a given booking. */
export function canReadBooking(viewer: Viewer, b: Pick<Booking, 'familyId' | 'nannyId' | 'status'>): boolean {
  if (viewer.role === 'admin') return true
  if (b.familyId === viewer.uid) return true
  if (b.nannyId === viewer.uid) return true
  if (viewer.role === 'nanny' && (b.status === 'open' || b.status === 'unmatched')) return true
  return false
}

/** May this viewer cancel/decline-update this booking? Mirrors the bookings `update` rule. */
export function canModifyBooking(viewer: Viewer, b: Pick<Booking, 'familyId' | 'nannyId' | 'status'>): boolean {
  if (viewer.role === 'admin') return true
  if (b.familyId === viewer.uid) return true
  if (b.nannyId === viewer.uid) return true
  if (viewer.role === 'nanny' && (b.status === 'open' || b.status === 'unmatched')) return true
  return false
}
