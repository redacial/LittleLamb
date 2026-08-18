// Give existing families a billing cycle, so quarterly billing can ever select them.
//
// WHY: nextChargeDate was only ever read or advanced, never initialized (fixed in 7385cfd).
// That fix seeds the cycle when a card is saved, so it only helps families who save a card
// FROM NOW ON. Anyone who onboarded before it stays permanently invisible to the billing job.
// This backfills them. It must run before billing is ever switched on.
//
// USAGE
//   Against the emulator (default, safe):
//     npm run emulators:all            # in another shell
//     node scripts/backfill-billing-cycle.mjs            # report only
//     node scripts/backfill-billing-cycle.mjs --apply    # write
//
//   Against PROD (deliberate, two flags + a credential):
//     export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/serviceAccountKey.json
//     node scripts/backfill-billing-cycle.mjs --prod            # report only
//     node scripts/backfill-billing-cycle.mjs --prod --apply    # write
//
// SAFETY — three properties worth stating explicitly:
//
// 1. It NEVER schedules a charge in the past or today. The due query is `<=`, so today counts
//    as due. Backdating would make families instantly due AND backdate cycleStart, sweeping
//    every historical booking into a surprise first invoice. Everyone gets a fresh 90-day
//    cycle from today, so nobody is billed for anything before the backfill.
//
// 2. It is idempotent. The cycle decision is delegated to initialBillingCycle(), the same
//    already-unit-tested function savePaymentMethod uses — it returns null when a cycle
//    exists, so re-running is a no-op and the two paths can never diverge.
//
// 3. It reports before it writes. Without --apply it only prints what it would do.
//
// ⚠️ Even in dry-run, the billing job ENQUEUES REAL INVOICE EMAILS for due families
// (enqueueMail sits outside the `if (enabled)` block). That is why this schedules the first
// charge 90 days out rather than immediately.

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const apply = process.argv.includes('--apply')
const prod = process.argv.includes('--prod')

const PROD_PROJECT = 'littlelamb-sb'
const EMULATOR_PROJECT = process.env.GCLOUD_PROJECT || 'littlelamb-demo'

let projectId
if (prod) {
  // Mirror scripts/make-admin.mjs: refuse to touch prod while emulator vars are set.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error('Refusing to run: --prod was passed but emulator env vars are set.')
    process.exit(1)
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Refusing to run: --prod requires GOOGLE_APPLICATION_CREDENTIALS pointing at a\n' +
        'service-account key (Firebase console -> Project settings -> Service accounts).',
    )
    process.exit(1)
  }
  projectId = PROD_PROJECT
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), projectId })
} else {
  // Emulator-only by construction, same as scripts/seed.mjs: force the hosts before init so
  // there is no code path from the default invocation to a real project.
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  projectId = EMULATOR_PROJECT
  initializeApp({ projectId })
}

// The single source of truth for "no cycle yet -> start one 90 days out". Imported from the
// compiled functions build so this script and savePaymentMethod can never disagree.
const { initialBillingCycle } = await import('../functions/lib/billing/quarterlyCharge.js')

const db = getFirestore()
const now = new Date()

console.log(`\nTarget    : ${projectId}${prod ? '  *** PRODUCTION ***' : '  (emulator)'}`)
console.log(`Mode      : ${apply ? 'APPLY (will write)' : 'report only (pass --apply to write)'}`)
console.log(`Today     : ${now.toISOString().slice(0, 10)}\n`)

// Full scan and filter in JS, deliberately. A `where('nextChargeDate','==',null)` would match
// NOTHING, because the field is absent rather than null — Firestore equality filters skip docs
// missing the field entirely. At this scale a scan is correct and unambiguous.
const snap = await db.collection('families').get()

const needing = []
let alreadyOnCycle = 0
let noCard = 0

for (const doc of snap.docs) {
  const d = doc.data()
  const patch = initialBillingCycle(d, now)
  if (patch === null) {
    alreadyOnCycle++
    continue
  }
  // A family with no card can never be charged (quarterlyCharge skips them), and
  // savePaymentMethod will seed the cycle correctly at card time. Leaving them alone keeps
  // the cycle honest — it should start when they become billable, not when this script ran.
  if (d.hasPaymentMethod !== true) {
    noCard++
    continue
  }
  needing.push({ id: doc.id, name: d.familyName ?? d.primaryEmail ?? '(unnamed)', patch })
}

console.log(`Families total          : ${snap.size}`)
console.log(`Already on a cycle      : ${alreadyOnCycle}  (skipped — idempotent)`)
console.log(`No card yet             : ${noCard}  (skipped — seeded when they add one)`)
console.log(`Need a cycle            : ${needing.length}\n`)

if (needing.length === 0) {
  console.log('Nothing to do.')
  process.exit(0)
}

for (const f of needing) {
  console.log(`  ${f.id}  ${f.name}  ->  first charge ${f.patch.nextChargeDate}`)
}

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write these.')
  process.exit(0)
}

let written = 0
for (const f of needing) {
  await db.collection('families').doc(f.id).set(f.patch, { merge: true })
  written++
}
console.log(`\nDone. ${written} ${written === 1 ? 'family' : 'families'} put on a billing cycle.`)
process.exit(0)
