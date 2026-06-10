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

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

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
  photoURL?: string | null
  bio: string
  introVideoURL?: string | null
  yearsExperience: string
  personalStatement: string
  selfBadges: string[]
  verifiedBadges: string[]
  availability: AvailabilityBlock[]
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
  createdAt: Timestamp | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: Role
  body: string
  createdAt: Timestamp | null
  /** Admin-only internal attribution — stripped before non-admins ever see it via rules. */
  repliedBy?: 'Lucy' | 'David' | null
}

export interface Conversation {
  id: string
  participantIds: string[]
  participantNames: Record<string, string>
  lastMessage: string
  lastMessageAt: Timestamp | null
  status: 'unread' | 'read' | 'replied'
  /** family<->nanny conversations require a completed booking to initiate. */
  kind: 'family_admin' | 'family_nanny' | 'nanny_admin'
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
