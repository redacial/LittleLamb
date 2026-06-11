import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { UserDoc } from '../types'

interface AuthState {
  /** Firebase auth user, or null when signed out. */
  user: User | null
  /** Canonical users/{uid} doc — the source of truth for role + approval. */
  profile: UserDoc | null
  /** True until the initial auth + profile resolution completes. */
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserDoc | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  // Resilience: if Firebase never responds (offline / unreachable backend), don't trap the
  // user on an infinite loader. After a grace period, fall through as signed-out so the public
  // site still loads. A later real auth callback still takes precedence and routes correctly.
  const [timedOut, setTimedOut] = useState(false)

  // Track Firebase auth state.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) {
        setProfile(null)
        setProfileReady(true)
      } else {
        setProfileReady(false)
      }
    })
  }, [])

  // Loader watchdog — 8s is well beyond a healthy auth round-trip but short enough to
  // recover gracefully from a stalled backend.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [])

  // Live-subscribe to the user's own doc so role/approval changes (e.g. admin approves the
  // account) reflect immediately without a re-login.
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserDoc) : null)
        setProfileReady(true)
      },
      () => {
        // Read denied or error — treat as no profile rather than leaking details.
        setProfile(null)
        setProfileReady(true)
      },
    )
    return unsub
  }, [user])

  const loading = (!authReady || !profileReady) && !timedOut

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext)
}
