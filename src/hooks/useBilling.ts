// Client billing entry points: load Stripe.js and call the billing Cloud Functions.
//
// GRACEFUL GATE: real card capture needs both a publishable key (VITE_STRIPE_PUBLISHABLE_KEY)
// and the deployed Cloud Functions (Blaze). When the key is absent — today, and in local
// dev — `stripeEnabled` is false and the wizard falls back to a "payment activates at
// launch" path so onboarding is never blocked while the backend is being stood up.
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

/** True when a Stripe publishable key is configured (real card capture is available). */
export const stripeEnabled = Boolean(publishableKey)

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
