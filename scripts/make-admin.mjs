// Promote an EXISTING Firebase Auth account to admin, in a REAL project.
//
// There is deliberately no in-app path to become admin (firestore.rules blocks it), so the
// very first admin must be provisioned with the Admin SDK, which bypasses rules. This script
// does exactly that — and nothing else. It does NOT create Auth users, seed demo data, or
// touch billing.
//
// USAGE (David, one time):
//   1. Create the admin's login the normal way first — either sign up through the app at
//      https://littlelamb-sb-app.web.app, or add the user in the Firebase console
//      (Authentication -> Users -> Add user). Note the email.
//   2. Authenticate the Admin SDK to prod. Easiest: download a service-account key from
//      Firebase console -> Project settings -> Service accounts -> Generate new private key,
//      save it, then:
//        export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
//        node scripts/make-admin.mjs admin@example.com "Lucy"
//      (Delete the key file afterwards.)
//   3. The account can now log in and lands on /admin.
//
// SAFETY: refuses to run against the emulator or a non-prod project id, prints the target
// project + email and requires the email to already exist as an Auth user. Never writes to
// billing. Idempotent — re-running just re-sets the same fields.

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const PROJECT_ID = 'littlelamb-sb' // prod only — this script is intentionally not parameterized
const [, , emailArg, nameArg] = process.argv

if (!emailArg) {
  console.error('Usage: node scripts/make-admin.mjs <email> [fullName]')
  process.exit(1)
}
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to run: emulator env vars are set. This script targets REAL prod.')
  process.exit(1)
}

// Support either GOOGLE_APPLICATION_CREDENTIALS (ADC) or an explicit key file path.
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const credential = keyPath
  ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
  : applicationDefault()

initializeApp({ credential, projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

function referralCode(uid) {
  return uid.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
}

const email = emailArg.trim().toLowerCase()

console.log(`\nTarget project: ${PROJECT_ID}`)
console.log(`Promoting to admin: ${email}\n`)

// The user must already exist as an Auth account — we promote, never create.
let user
try {
  user = await auth.getUserByEmail(email)
} catch {
  console.error(
    `No Auth user found for ${email}. Create the login first (sign up in the app or ` +
      `Firebase console -> Authentication -> Add user), then re-run this.`,
  )
  process.exit(1)
}

const now = FieldValue.serverTimestamp()
const doc = {
  uid: user.uid,
  role: 'admin',
  email,
  fullName: nameArg || user.displayName || 'Admin',
  phone: '',
  approved: true,
  status: 'approved',
  wizardComplete: true,
  referredBy: null,
  referralSource: null,
  referralCode: referralCode(user.uid),
  updatedAt: now,
}

// merge:true so we don't clobber createdAt if the doc already exists; set it only if absent.
const ref = db.collection('users').doc(user.uid)
const existing = await ref.get()
if (!existing.exists) doc.createdAt = now
await ref.set(doc, { merge: true })

console.log(`✔ ${email} (uid ${user.uid}) is now an admin. They can log in and land on /admin.`)
process.exit(0)
