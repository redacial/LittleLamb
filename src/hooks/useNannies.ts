// Read the directory of nannies and individual nanny profiles. The public profile doc
// (nannies/{uid}) carries a denormalized fullName, so the directory never needs to read the
// private users collection — keeping users/{uid} non-listable (security audit, Phase 5).
import { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { NannyProfile } from '../types'

export interface DirectoryNanny extends NannyProfile {
  fullName: string
}

/** All nanny profiles (only approved nannies have a readable nannies/{uid} doc per rules). */
export function useNannyDirectory() {
  const [nannies, setNannies] = useState<DirectoryNanny[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const profilesSnap = await getDocs(collection(db, 'nannies'))
        const list = profilesSnap.docs.map((d) => {
          const data = d.data() as NannyProfile
          return { ...data, fullName: data.fullName || 'Nanny' }
        })
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
        // Read only the public profile doc — fullName is denormalized there, so we never need
        // (and rules never grant) a read of another user's private users/{uid} document.
        const profileSnap = await getDoc(doc(db, 'nannies', uid))
        if (alive && profileSnap.exists()) {
          const data = profileSnap.data() as NannyProfile
          setNanny({ ...data, fullName: data.fullName || 'Nanny' })
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
