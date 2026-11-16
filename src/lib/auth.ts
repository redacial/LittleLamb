// Auth service — all Firebase auth + user-document operations. UI never touches Firebase
// directly (CLAUDE.md architecture: Firebase calls live in hooks/lib, not components).
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Role, UserDoc, ReferralSource, NannyStage } from '../types'
import { generateReferralCode } from './referral'
import { cleanLine, cleanText } from './sanitize'

const googleProvider = new GoogleAuthProvider()

export async function fetchUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserDoc) : null
}

/**
 * The application answers collected by /apply. Optional and role-specific: family applicants
 * supply the first three, nanny applicants the last two. Persisted onto users/{uid} so the
 * application survives signup and an admin can review it — see UserDoc.
 */
export interface ApplicationAnswers {
  children?: string
  notes?: string
  yearsExperience?: string
  personalStatement?: string
}

/**
 * Field-by-field length caps. These MUST match the strMax() guards in firestore.rules —
 * if the client allowed more than the rules do, the whole setDoc is rejected and the
 * applicant loses their account, not just the overlong field.
 */
const LIMITS = {
  children: 500,
  notes: 1000,
  yearsExperience: 60,
  personalStatement: 1000,
} as const

/**
 * Sanitizes the application answers and drops empties. This is untrusted input from an
 * UNAUTHENTICATED public form, so it is cleaned here at the write boundary rather than
 * trusting the caller — CLAUDE.md: "Sanitize every user input before any database write."
 * Single-line fields use cleanLine (collapses newlines); free text uses cleanText.
 *
 * Blank answers are omitted entirely rather than stored as '' — an absent field reads as
 * "not asked / not answered" in the admin view, whereas '' is indistinguishable from a
 * deliberate empty answer and needlessly bloats every doc.
 */
function cleanApplication(input: ApplicationAnswers): Partial<ApplicationAnswers> {
  const out: Partial<ApplicationAnswers> = {}
  const put = (key: keyof ApplicationAnswers, value: string) => {
    if (value) out[key] = value
  }
  put('children', cleanText(input.children, LIMITS.children))
  put('notes', cleanText(input.notes, LIMITS.notes))
  put('yearsExperience', cleanLine(input.yearsExperience, LIMITS.yearsExperience))
  put('personalStatement', cleanText(input.personalStatement, LIMITS.personalStatement))
  return out
}

interface CreateAccountInput extends ApplicationAnswers {
  email: string
  password: string
  fullName: string
  phone: string
  role: Role
  referredBy?: string | null
  referralSource?: ReferralSource | null
}

/**
 * The approval fields a brand-new account starts with, by role.
 *
 * Launch decision (2026-11-16): FAMILIES are auto-approved — a family is a free, paying
 * audience, not a trust surface, so the moment they sign up they are on the service with no
 * admin step (approved=true, status=approved, no application stage).
 *
 * NANNIES remain vetted: a nanny is exactly the trust surface parents rely on ("every nanny is
 * background-checked and admin-approved"), so a nanny self-signup must stay approved=false /
 * status=pending and only an admin may flip it (enforced in firestore.rules). This split is a
 * security invariant — do not auto-approve nannies.
 */
export function initialApproval(role: Role): {
  approved: boolean
  status: UserDoc['status']
  stage: NannyStage | undefined
} {
  if (role === 'family') return { approved: true, status: 'approved', stage: undefined }
  return { approved: false, status: 'pending', stage: 'application_received' }
}

/**
 * Creates an auth user + the canonical users/{uid} document. The user doc is the single
 * source of truth for role and approval. Families start approved; nannies start pending and
 * can only be approved by an admin via rules (see initialApproval).
 */
export async function createAccount(input: CreateAccountInput): Promise<UserDoc> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password)
  await updateProfile(cred.user, { displayName: input.fullName })

  const { approved, status, stage } = initialApproval(input.role)

  const userDoc: UserDoc = {
    uid: cred.user.uid,
    role: input.role,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    approved,
    status,
    wizardComplete: false,
    stage,
    referredBy: input.referredBy ?? null,
    referralSource: input.referralSource ?? null,
    referralCode: generateReferralCode(cred.user.uid),
    // The application answers, sanitized. Without these the users doc carries no record of
    // what the applicant actually submitted, and an admin approves on name + email alone.
    ...cleanApplication(input),
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  }

  // Strip undefined (Firestore rejects undefined values).
  const clean = Object.fromEntries(
    Object.entries(userDoc).filter(([, v]) => v !== undefined),
  )
  await setDoc(doc(db, 'users', cred.user.uid), clean)
  return userDoc
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

/**
 * Google sign-in. If this is the user's first time (no user doc), we provision one with the
 * provided role + referral attribution. Existing users keep their stored role — the role
 * argument is ignored for returning users so a returning admin can never be downgraded and a
 * returning family can never self-promote.
 */
export async function signInWithGoogle(
  role: Role,
  attribution?: {
    referredBy?: string | null
    referralSource?: ReferralSource | null
  } & ApplicationAnswers,
): Promise<UserDoc> {
  const cred = await signInWithPopup(auth, googleProvider)
  const existing = await fetchUserDoc(cred.user.uid)
  if (existing) return existing

  const { approved, status, stage } = initialApproval(role)
  const userDoc: UserDoc = {
    uid: cred.user.uid,
    role,
    email: cred.user.email ?? '',
    fullName: cred.user.displayName ?? 'New member',
    phone: '',
    approved,
    status,
    wizardComplete: false,
    stage,
    referredBy: attribution?.referredBy ?? null,
    referralSource: attribution?.referralSource ?? null,
    referralCode: generateReferralCode(cred.user.uid),
    // Google signups fill in the same /apply form, so their answers persist identically.
    ...cleanApplication(attribution ?? {}),
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  }
  const clean = Object.fromEntries(Object.entries(userDoc).filter(([, v]) => v !== undefined))
  await setDoc(doc(db, 'users', cred.user.uid), clean)
  return userDoc
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

export type { User }
