// Single place the Admin SDK is initialized. Every trigger imports its Firestore /
// Auth / Storage handle from here (mirrors the client's single `src/lib/firebase.ts`).
// Admin access bypasses security rules by design — server code is trusted.
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Guard against double-init (the emulator can re-import modules across triggers).
if (getApps().length === 0) {
  initializeApp()
}

export const db = getFirestore()
export const auth = getAuth()
export const storage = getStorage()
