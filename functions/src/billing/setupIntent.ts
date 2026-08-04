// Onboarding card capture (out of PCI scope — the card never touches our servers).
//
// createSetupIntent: ensure a Stripe Customer for the family, return a SetupIntent
//   client_secret the client confirms with Stripe Elements.
// savePaymentMethod: after the client confirms, mark it the customer's default and set
//   families/{uid}.hasPaymentMethod = true SERVER-side (the client can no longer write
//   that field — see the tightened rule).
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase'
import { REGION, STRIPE_SECRET_KEY } from '../config'
import { getStripe } from './stripe'

/** Ensure the family has a Stripe Customer; returns the customer id. */
async function ensureCustomer(uid: string, email: string | undefined): Promise<string> {
  const famRef = db.collection('families').doc(uid)
  const fam = await famRef.get()
  const existing = fam.data()?.stripeCustomerId
  if (typeof existing === 'string' && existing.length > 0) return existing

  const customer = await getStripe().customers.create({
    email,
    metadata: { familyId: uid },
  })
  // set (merge) so this never clobbers other family fields.
  await famRef.set({ stripeCustomerId: customer.id }, { merge: true })
  return customer.id
}

export const createSetupIntent = onCall(
  { region: REGION, secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

    const customerId = await ensureCustomer(uid, req.auth?.token.email as string | undefined)
    const intent = await getStripe().setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // we charge quarterly with no customer present
    })
    return { clientSecret: intent.client_secret }
  },
)

export const savePaymentMethod = onCall(
  { region: REGION, secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
    const paymentMethodId = req.data?.paymentMethodId
    if (typeof paymentMethodId !== 'string' || !paymentMethodId) {
      throw new HttpsError('invalid-argument', 'paymentMethodId is required.')
    }

    const famRef = db.collection('families').doc(uid)
    const customerId = (await famRef.get()).data()?.stripeCustomerId
    if (typeof customerId !== 'string') {
      throw new HttpsError('failed-precondition', 'No Stripe customer for this family.')
    }

    // Attach + set as the default payment method for off-session invoices.
    await getStripe().paymentMethods.attach(paymentMethodId, { customer: customerId })
    await getStripe().customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Server is the ONLY writer of hasPaymentMethod now (client rule forbids it).
    await famRef.set(
      { hasPaymentMethod: true, paymentMethodUpdatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    return { ok: true }
  },
)
