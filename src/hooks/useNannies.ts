// Read the directory of approved nannies and individual nanny profiles + their public user info.
import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { NannyProfile, UserDoc } from '../types'

export interface DirectoryNanny extends NannyProfile {
  fullName: string
}

/** All approved nannies (joins nannies/{uid} profile with their users/{uid} display name). */
export function useNannyDirectory() {
  const [nannies, setNannies] = useState<DirectoryNanny[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'nanny'), where('approved', '==', true)),
        )
        const names = new Map<string, string>()
        usersSnap.docs.forEach((d) => names.set(d.id, (d.data() as UserDoc).fullName))

        const profilesSnap = await getDocs(collection(db, 'nannies'))
        const list = profilesSnap.docs
          .filter((d) => names.has(d.id))
          .map((d) => ({ ...(d.data() as NannyProfile), fullName: names.get(d.id) ?? 'Nanny' }))
        if (alive) setNannies(list)
      } catch {
        if (alive) setNannies([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { nannies, loading }
}

export function useNanny(uid: string | undefined) {
  const [nanny, setNanny] = useState<DirectoryNanny | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let alive = true
    ;(async () => {
      try {
        const [profileSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'nannies', uid)),
          getDoc(doc(db, 'users', uid)),
        ])
        if (alive && profileSnap.exists()) {
          setNanny({
            ...(profileSnap.data() as NannyProfile),
            fullName: (userSnap.data() as UserDoc | undefined)?.fullName ?? 'Nanny',
          })
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [uid])

  return { nanny, loading }
}
