// Firebase initialization — config loaded exclusively from environment variables.
// Never hardcode config here (CLAUDE.md security rule). Access control is enforced by
// Firestore/Storage security rules, not by hiding these public identifiers.
import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

function requireEnv(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined
  if (!value) {
    // Surfaces a clear, generic startup error rather than a cryptic Firebase failure.
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill in your Firebase config.`,
    )
  }
  return value
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
}

export const app = initializeApp(firebaseConfig)

// App Check (checklist §14 — anti-abuse / rate-limiting). Attests requests come from our app
// before Firebase backends that ENFORCE App Check accept them. Enforcement currently exists on
// the billing callables only (functions/src/billing/setupIntent.ts); Firestore rules
// deliberately do not require request.app. See docs/app-check-runbook.md.
//
// No-op when no reCAPTCHA site key is configured (local dev / emulators). This must never
// throw the way requireEnv() does for the six core config vars: white-screening the whole
// site over a missing anti-abuse key is worse than the gap it leaves. In production we warn
// loudly instead, so failing open is visible rather than silent.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
} else if (import.meta.env.PROD) {
  console.warn(
    '[App Check] VITE_FIREBASE_APPCHECK_SITE_KEY is not set — App Check is NOT active in this ' +
      'production build. Requests carry no attestation token, so any App Check enforcement ' +
      '(billing callables) will reject them. See docs/app-check-runbook.md.',
  )
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// Callable/HTTPS Cloud Functions (billing setup-intent etc.). Region must match the
// functions' deploy region (see functions/src/config.ts REGION).
export const functions = getFunctions(app, 'us-central1')

// Local development against the Firebase emulator suite.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
