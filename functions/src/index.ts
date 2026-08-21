// Cloud Functions entry point — Firebase's deploy scanner reads the exports HERE.
//
// Convention (see functions/README.md):
//   - This file ONLY re-exports triggers. Each trigger lives in its own file and
//     exports one function.
//   - All Admin SDK access goes through `./firebase` singletons.
//   - Secrets are declared in `./config` via defineSecret and bound per-function.
//   - Pure logic (email templates, ical, recurring detection, invoice math) lives in
//     `./shared` and `./email`/`./billing` helpers with NO Firebase import, so it
//     unit-tests without the emulator.
//
// Triggers are wired in as each chunk lands (kept commented until the file exists, so
// the project always builds green). An empty index is itself valid and deployable.

// Email pipeline (Chunk 3)
export { onMailCreated } from './email/send'

// Waitlist notification (Chunk 4)
export { onWaitlistCreated } from './waitlist/onWaitlist'

// Recurring 48h auto-cancel (Chunk 5)
export { recurringAutoCancel } from './scheduled/recurringAutoCancel'

// Stripe billing (Chunk 6)
export { createSetupIntent, savePaymentMethod } from './billing/setupIntent'
export { quarterlyCharge } from './billing/quarterlyCharge'
export { stripeWebhook, onInvoiceCreated } from './billing/webhook'
