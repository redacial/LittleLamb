// Profile data hooks — read/write families/{uid} and nannies/{uid}. All Firestore access for
// onboarding + My Profile flows funnels through here (CLAUDE.md: Firebase calls live in hooks).
import { useEffect, useState, useCallback } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { parseRateDollars } from '../lib/rates'
import type { Child, FamilyProfile, NannyProfile, RateDraft, RateRange } from '../types'

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

// ---- Family ----------------------------------------------------------------
export function useFamilyProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<FamilyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let alive = true
    getDoc(doc(db, 'families', uid))
      .then((snap) => alive && setProfile(snap.exists() ? (snap.data() as FamilyProfile) : null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [uid])

  const save = useCallback(
    async (patch: Partial<FamilyProfile>) => {
      if (!uid) throw new Error('Not signed in.')
      const data = stripUndefined({ ...patch, uid, updatedAt: serverTimestamp() })
      await setDoc(doc(db, 'families', uid), data, { merge: true })
      setProfile((prev) => ({ ...(prev ?? ({ uid } as FamilyProfile)), ...patch }))
    },
    [uid],
  )

  return { profile, loading, save }
}

// ---- Nanny -----------------------------------------------------------------
export function useNannyProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<NannyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let alive = true
    getDoc(doc(db, 'nannies', uid))
      .then((snap) => alive && setProfile(snap.exists() ? (snap.data() as NannyProfile) : null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [uid])

  const save = useCallback(
    async (patch: Partial<NannyProfile>) => {
      if (!uid) throw new Error('Not signed in.')
      const data = stripUndefined({ ...patch, uid, updatedAt: serverTimestamp() })
      await setDoc(doc(db, 'nannies', uid), data, { merge: true })
      setProfile((prev) => ({ ...(prev ?? ({ uid } as NannyProfile)), ...patch }))
    },
    [uid],
  )

  return { profile, loading, save }
}

// ---- Mark onboarding wizard complete (flips users/{uid}.wizardComplete) -----
export async function completeWizard(uid: string) {
  await updateDoc(doc(db, 'users', uid), { wizardComplete: true, updatedAt: serverTimestamp() })
}

// ---- Wizard resume + partial-entry preservation -----------------------------
// Everything below exists because the setup wizards used to DISCARD half-finished input.
// These are pure helpers so both wizards share one definition of "the user typed
// something here", and so that definition is unit-testable on its own.

/**
 * Where to reopen a wizard, given whatever the profile has. Anything missing, negative,
 * fractional or beyond the last step falls back to the first step — a stored value we
 * don't recognise must never strand someone on a blank screen.
 */
export function resumeStep(stored: number | undefined, stepCount: number): number {
  if (!Number.isInteger(stored)) return 0
  const step = stored as number
  if (step < 0 || step > stepCount - 1) return 0
  return step
}

/**
 * Has the parent put ANY content in this child row?
 *
 * The old test was `c.name` alone, which silently deleted a row where an age and
 * interests had been typed but the name hadn't yet. A row counts as real if any of its
 * three fields has content; only a row left completely untouched is dropped.
 */
export function childHasContent(c: Child): boolean {
  return Boolean(c.name.trim() || c.age.trim() || (c.interests ?? '').trim())
}

/**
 * Split a typed min/max pair into what may be STORED as a real range and what can only be
 * kept as a draft.
 *
 * `rateRange` is integer cents and firestore.rules requires both bounds present and
 * ordered, so a half-filled pair cannot go there — it would be rejected by the server. We
 * therefore write the raw strings to `rateDraft` instead of throwing them away, and clear
 * the draft once a complete range supersedes it.
 */
export function splitRateEntry(
  min: string,
  max: string,
): { rateRange?: RateRange; rateDraft: RateDraft | null } {
  const lo = parseRateDollars(min)
  const hi = parseRateDollars(max)
  if (lo !== null && hi !== null && lo <= hi) {
    // Complete and valid — the draft has served its purpose.
    return { rateRange: { minCents: lo, maxCents: hi }, rateDraft: null }
  }
  const touched = min.trim() !== '' || max.trim() !== ''
  return { rateDraft: touched ? { min: min.trim(), max: max.trim() } : null }
}

/**
 * The rate patch to merge into a profile save. `rateDraft: null` (rather than omitting it)
 * is deliberate: it must actively clear a previously stored draft, and stripUndefined only
 * strips `undefined`, so null survives to Firestore as a delete-by-overwrite.
 */
export function ratePatch(min: string, max: string): Partial<FamilyProfile & NannyProfile> {
  const { rateRange, rateDraft } = splitRateEntry(min, max)
  return { ...(rateRange ? { rateRange } : {}), rateDraft }
}
