// Central config: secret handles (bound per-function so keys never live in the client
// or in env files) and platform constants. Secrets are set once on Blaze day via
//   firebase functions:secrets:set RESEND_API_KEY   (etc.)
// and referenced by functions through the `secrets: [...]` option.
import { defineSecret } from 'firebase-functions/params'

export const RESEND_API_KEY = defineSecret('RESEND_API_KEY')
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

/** Region all functions deploy to. Kept in one place so it is trivial to change. */
export const REGION = 'us-central1'

/** From address for all outbound platform email (verified sender domain on Resend). */
export const EMAIL_FROM = 'Little Lamb Nannies <hello@littlelambnannies.com>'

/** Admin inbox that receives operational notifications (e.g. new waitlist signups). */
export const ADMIN_EMAIL = 'hello@littlelambnannies.com'

/**
 * Default billing rates (US cents). These are the fallback if the `config/billing`
 * Firestore doc is absent; the doc, when present, is authoritative (editable by admin
 * without a redeploy). Mirrors the $25/quarter + $1/booking model in CLAUDE.md Part 13.
 */
export const BILLING_DEFAULTS = {
  subscriptionCents: 2500,
  perBookingCents: 100,
  /** Billing cycle length in days (quarterly = 90 from signup). */
  cycleDays: 90,
} as const
