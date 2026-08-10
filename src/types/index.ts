// Shared domain types for Little Lamb Nannies.
// Single source of truth for the shapes stored in Firestore and passed through the UI.

import type { Timestamp } from 'firebase/firestore'

export type Role = 'family' | 'nanny' | 'admin'

/** Nanny application review stages (drives the holding-page progress bar). */
export type NannyStage =
  | 'application_received'
  | 'under_review'
  | 'interview_scheduled'
  | 'decision_made'

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'inactive'

/** Base account document at users/{uid}. Holds the trust-critical role + approval flags. */
export interface UserDoc {
  uid: string
  role: Role
  email: string
  fullName: string
  phone: string
  approved: boolean
  status: ApplicationStatus
  wizardComplete: boolean
  /** Only meaningful for nannies. */
  stage?: NannyStage
  /** Referral attribution. */
  referredBy?: string | null
  referralSource?: ReferralSource | null
  referralCode: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type ReferralSource = 'google' | 'instagram' | 'friend' | 'other' | 'referral_link'

export interface Child {
  name: string
  age: string
  interests?: string
}

/** families/{uid} — public-facing + profile data. */
export interface FamilyProfile {
  uid: string
  photoURL?: string | null
  neighborhood: string
  children: Child[]
  pets?: string
  allergies?: string
  houseRules?: string
  homeAddress: string
  primaryEmail: string
  phone: string
  coParentName?: string
  coParentEmail?: string
  /** Application snapshot (admin-only fields live alongside in the same doc, gated by rules). */
  specialNotes?: string
  hasPaymentMethod: boolean
  /** Hourly rate this family is willing to pay. Optional — pre-existing families have none. */
  rateRange?: RateRange
}

/**
 * An hourly pay range, in INTEGER CENTS (following the config/billing precedent —
 * avoids float comparison in Firestore rules and rounding drift in the UI).
 * Bounds are inclusive and min <= max.
 *
 * Families declare what they'll PAY; nannies declare what they ACCEPT. An overlap
 * between the two is what makes a match — see src/lib/rates.ts. Little Lamb never
 * processes wages: this is a matching signal only, always shown with a disclaimer.
 */
export interface RateRange {
  minCents: number
  maxCents: number
}

export type BadgeType = 'verified' | 'self'

export interface Badge {
  id: string
  label: string
  type: BadgeType
}

/** Recurring weekly availability. day 0 = Sunday. */
export interface AvailabilityBlock {
  day: number
  start: string // "15:00"
  end: string // "20:00"
}

/** nannies/{uid} — public profile + availability. */
export interface NannyProfile {
  uid: string
  /** Denormalized display name so the directory reads only this (public) doc, not users/{uid}. */
  fullName?: string
  photoURL?: string | null
  bio: string
  introVideoURL?: string | null
  yearsExperience: string
  personalStatement: string
  selfBadges: string[]
  verifiedBadges: string[]
  availability: AvailabilityBlock[]
  /** Hourly rate this nanny accepts. Optional — pre-existing nannies have none. */
  rateRange?: RateRange
}

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'open'
  | 'unmatched'
  | 'same_day_review'

/** bookings/{id}. */
export interface Booking {
  id: string
  familyId: string
  familyName: string
  nannyId: string | null
  nannyName: string | null
  date: string // ISO date "2026-06-14"
  startTime: string // "15:00"
  endTime: string // "20:00"
  address: string
  notes?: string
  status: BookingStatus
  recurring: boolean
  recurrenceId?: string | null
  /**
   * The rate range agreed at booking time, SNAPSHOTTED so a later profile edit can't
   * retroactively rewrite what was agreed. When the two sides overlapped this is the
   * overlap window and `rateAgreed` is true; when they didn't it's the nanny's range
   * and `rateAgreed` is false (the booking goes out as `pending` for them to accept).
   * Absent on bookings made before rate ranges existed, and on admin-created bookings.
   */
  rateMinCents?: number
  rateMaxCents?: number
  rateAgreed?: boolean
  createdAt: Timestamp | null
}

export interface Invoice {
  id: string
  familyId: string
  familyName: string
  quarterLabel: string
  subscriptionFee: number
  bookingCount: number
  bookingFees: number
  total: number
  status: 'paid' | 'pending' | 'failed'
  issuedAt: string
  pdfPath?: string | null
}

export interface Review {
  id: string
  bookingId: string
  authorId: string
  authorRole: Role
  subjectId: string
  rating: number
  comment: string
  createdAt: Timestamp | null
}

export interface Referral {
  code: string
  ownerId: string
  ownerName: string
  ownerRole: Role
  signups: number
}
