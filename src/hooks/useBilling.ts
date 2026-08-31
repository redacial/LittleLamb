// Client billing entry points: load Stripe.js and call the billing Cloud Functions.
//
// GRACEFUL GATE: real card capture needs a publishable key (VITE_STRIPE_PUBLISHABLE_KEY), the
// deployed Cloud Functions (Blaze), AND an explicit live flag. When card capture is off — local
// dev, and at LAUNCH — the wizard falls back to a "payment activates at launch" path so
// onboarding is never blocked.
//
// Why a flag and not just the key (DECISIONS D70): the launch build ships with a *test* key in
// .env.production so the money path can be exercised later, but Little Lamb launches with billing
// OFF (no EIN → no live Stripe). If the key alone armed card capture, the launch wizard would
// mount Stripe Elements and call App-Check-enforced SetupIntent callables that aren't meant to run
// yet. David chose the fallback as the launch posture. So real card capture requires the key AND
// VITE_BILLING_LIVE === 'true' — the single switch flipped when billing goes live.
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

/**
 * The launch gate, as a pure function of its two env inputs so it can be tested without
 * module-load env stubbing. Real card capture is on ONLY when a non-empty key is present and the
 * live flag is exactly the string "true" — any other flag value (unset, "1", "TRUE") stays off.
 */
export function computeStripeEnabled(env: {
  publishableKey: string | undefined
  billingLive: string | undefined
}): boolean {
  return Boolean(env.publishableKey) && env.billingLive === 'true'
}

/** True when real card capture is available (key present AND VITE_BILLING_LIVE === 'true'). */
export const stripeEnabled = computeStripeEnabled({
  publishableKey,
  billingLive: import.meta.env.VITE_BILLING_LIVE as string | undefined,
})

let stripePromise: Promise<Stripe | null> | null = null
/** Lazily load Stripe.js once. Returns null if no key is configured. */
export function getStripeJs(): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null)
  if (!stripePromise) stripePromise = loadStripe(publishableKey)
  return stripePromise
}

const createSetupIntentFn = httpsCallable<void, { clientSecret: string | null }>(
  functions,
  'createSetupIntent',
)
const savePaymentMethodFn = httpsCallable<{ paymentMethodId: string }, { ok: boolean }>(
  functions,
  'savePaymentMethod',
)

/** Ask the server for a SetupIntent client secret to confirm a card with Elements. */
export async function createSetupIntent(): Promise<string> {
  const res = await createSetupIntentFn()
  const secret = res.data.clientSecret
  if (!secret) throw new Error('Could not start card setup.')
  return secret
}

/** Tell the server which payment method the family confirmed, so it becomes default. */
export async function savePaymentMethod(paymentMethodId: string): Promise<void> {
  await savePaymentMethodFn({ paymentMethodId })
}
