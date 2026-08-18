// Run the quarterly billing engine against the local EMULATOR and print what it did.
//
//   1. npm run emulators:all          (functions + firestore + auth + storage)
//   2. npm run seed                   (creates a billing-ready family)
//   3. npm run billing:local          (this script)
//
// WHY THIS EXISTS, rather than triggering the scheduled function:
// the Firebase emulator does NOT run a cron. `onSchedule` only registers a Pub/Sub topic, so
// "triggering" it locally means hand-publishing a base64 envelope to a guessed topic name.
// Calling runQuarterlyCharge() directly is what the extraction in quarterlyCharge.ts was for:
// we control `now` (so cycle boundaries are testable, which the pubsub path cannot do), we
// control `enabled`, and we get {invoiced, skipped} back instead of scraping logs.
//
// SAFETY. This talks ONLY to the emulator — the *_EMULATOR_HOST vars are set below before the
// Admin SDK is imported, and there is no flag to point it at a real project. It also runs with
// enabled=false unless --charge is passed, and with enabled=false the Stripe client is never
// even constructed, so no key is required and no charge can occur.
//
// ⚠️ Even in dry-run this ENQUEUES REAL INVOICE EMAILS (enqueueMail sits outside the
// `if (enabled)` block). Run the emulator with MAIL_TRANSPORT=noop — functions/.env.local sets
// it — or those emails will actually be delivered by onMailCreated.

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'littlelamb-demo'
process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
// Deployed functions infer the default bucket from the runtime; a bare `initializeApp()` in a
// local script does not, so the invoice PDF render would fail with "Bucket name not specified".
// That error is caught and non-fatal (the invoice is still written), but setting it here means
// the PDF path is actually exercised rather than silently skipped every run.
process.env.STORAGE_BUCKET = process.env.STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`
process.env.FIREBASE_CONFIG =
  process.env.FIREBASE_CONFIG ||
  JSON.stringify({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` })

const charge = process.argv.includes('--charge')
// Optional `--now=YYYY-MM-DD` so cycle boundaries can be tested without waiting 90 days.
const nowArg = process.argv.find((a) => a.startsWith('--now='))
const now = nowArg ? new Date(`${nowArg.slice('--now='.length)}T12:00:00Z`) : new Date()
if (Number.isNaN(now.getTime())) {
  console.error('Invalid --now= date. Use --now=YYYY-MM-DD.')
  process.exit(1)
}

// Imported from the COMPILED output, so `npm --prefix functions run build` must have run —
// otherwise this silently executes a stale build.
const { runQuarterlyCharge, liveChargeDeps } = await import(
  '../functions/lib/billing/quarterlyCharge.js'
)
const { BILLING_DEFAULTS } = await import('../functions/lib/config.js')

const rates = {
  subscriptionCents: BILLING_DEFAULTS.subscriptionCents,
  perBookingCents: BILLING_DEFAULTS.perBookingCents,
}

console.log(`Project     : ${PROJECT_ID} (emulator at ${process.env.FIRESTORE_EMULATOR_HOST})`)
console.log(`Billing date: ${now.toISOString().slice(0, 10)}`)
console.log(`Mode        : ${charge ? '*** CHARGING (Stripe test mode) ***' : 'dry-run (no Stripe call)'}`)
console.log(`Rates       : $${(rates.subscriptionCents / 100).toFixed(2)}/quarter + $${(rates.perBookingCents / 100).toFixed(2)}/booking\n`)

const result = await runQuarterlyCharge(liveChargeDeps(rates, charge, now))

console.log(`\nInvoiced: ${result.invoiced}   Skipped: ${result.skipped}`)
if (result.invoiced === 0) {
  console.log(
    '\nNo families were invoiced. A family is only due when ALL of these hold:\n' +
      `  - nextChargeDate <= ${now.toISOString().slice(0, 10)}\n` +
      '  - stripeCustomerId is set\n' +
      '  - hasPaymentMethod === true\n' +
      'Run `npm run seed` first, or check the family doc in the emulator UI.',
  )
}
process.exit(0)
