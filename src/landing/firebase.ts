// Minimal Firebase init for the PUBLIC pre-launch landing site.
//
// Deliberately narrower than src/lib/firebase.ts: the landing bundle is purely public
// marketing + a waitlist/contact form, so it initializes ONLY the app + Firestore (for the
// waitlist write) and, when configured, App Check (abuse protection on the form). No auth,
// no storage — the unfinished app is not reachable from the deployed site, and there's no
// reason to ship those SDKs to signed-out visitors.
//
// Config still comes exclusively from environment variables (never hardcode — CLAUDE.md
// security rule). These identifiers are public by design; access is enforced by Firestore
// security rules (see the `waitlist` collection rules), not by hiding them.
import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

function requireEnv(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined
  if (!value) {
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

// App Check — attests form submissions come from our real site before Firestore accepts the
// write, mitigating scripted spam on the public waitlist. No-op without a reCAPTCHA site key.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const db = getFirestore(app)

// Local development against the Firestore emulator.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
