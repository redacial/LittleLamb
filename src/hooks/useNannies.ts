// Read the directory of nannies and individual nanny profiles. The public profile doc
// (nannies/{uid}) carries a denormalized fullName, so the directory never needs to read the
// private users collection — keeping users/{uid} non-listable (security audit, Phase 5).
import { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc, query, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { NannyProfile } from '../types'

export interface DirectoryNanny extends NannyProfile {
  fullName: string
}

/**
 * Cap on the directory read. Unlike the admin lists this is a one-shot getDocs, but it
 * is still an unbounded whole-collection read that every family and nanny performs on
 * page load. Set well above the plausible size of a Santa Barbara nanny network.
 */
export const DIRECTORY_PAGE_SIZE = 200

/** All nanny profiles (only approved nannies have a readable nannies/{uid} doc per rules). */
export function useNannyDirectory() {
  const [nannies, setNannies] = useState<DirectoryNanny[]>([])
  const [loading, setLoading] = useState(true)
  // Same reasoning as the admin hooks (D50): a failed read used to render as "no nannies
  // yet", which is a very different message from "we couldn't load the directory".
  const [error, setError] = useState<Error | null>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const profilesSnap = await getDocs(
          query(collection(db, 'nannies'), limit(DIRECTORY_PAGE_SIZE)),
        )
        const list = profilesSnap.docs.map((d) => {
          const data = d.data() as NannyProfile
          return { ...data, fullName: data.fullName || 'Nanny' }
        })
        if (alive) {
          setNannies(list)
          setTruncated(profilesSnap.size >= DIRECTORY_PAGE_SIZE)
          setError(null)
        }
      } catch (err) {
        if (alive) {
          setNannies([])
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { nannies, loading, error, truncated }
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
