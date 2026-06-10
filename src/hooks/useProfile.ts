// Profile data hooks — read/write families/{uid} and nannies/{uid}. All Firestore access for
// onboarding + My Profile flows funnels through here (CLAUDE.md: Firebase calls live in hooks).
import { useEffect, useState, useCallback } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { FamilyProfile, NannyProfile } from '../types'

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
