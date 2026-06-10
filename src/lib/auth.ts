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

const googleProvider = new GoogleAuthProvider()

export async function fetchUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserDoc) : null
}

interface CreateAccountInput {
  email: string
  password: string
  fullName: string
  phone: string
  role: Role
  referredBy?: string | null
  referralSource?: ReferralSource | null
}

/**
 * Creates an auth user + the canonical users/{uid} document. The user doc is the single
 * source of truth for role and approval — both are written server-trusted defaults here
 * (approved=false, status=pending) and can only be flipped to approved by an admin via
 * rules. Families and nannies both start unapproved per the flow docs.
 */
export async function createAccount(input: CreateAccountInput): Promise<UserDoc> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password)
  await updateProfile(cred.user, { displayName: input.fullName })

  const stage: NannyStage | undefined =
    input.role === 'nanny' ? 'application_received' : undefined

  const userDoc: UserDoc = {
    uid: cred.user.uid,
    role: input.role,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    approved: false,
    status: 'pending',
    wizardComplete: false,
    stage,
    referredBy: input.referredBy ?? null,
    referralSource: input.referralSource ?? null,
    referralCode: generateReferralCode(cred.user.uid),
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
  attribution?: { referredBy?: string | null; referralSource?: ReferralSource | null },
): Promise<UserDoc> {
  const cred = await signInWithPopup(auth, googleProvider)
  const existing = await fetchUserDoc(cred.user.uid)
  if (existing) return existing

  const stage: NannyStage | undefined = role === 'nanny' ? 'application_received' : undefined
  const userDoc: UserDoc = {
    uid: cred.user.uid,
    role,
    email: cred.user.email ?? '',
    fullName: cred.user.displayName ?? 'New member',
    phone: '',
    approved: false,
    status: 'pending',
    wizardComplete: false,
    stage,
    referredBy: attribution?.referredBy ?? null,
    referralSource: attribution?.referralSource ?? null,
    referralCode: generateReferralCode(cred.user.uid),
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
