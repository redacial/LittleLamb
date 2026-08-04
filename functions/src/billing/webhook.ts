// Stripe webhook: reconcile payment outcomes back into Firestore. Signature-verified
// with the STRIPE_WEBHOOK_SECRET so only genuine Stripe events are honored.
//
// payment_intent.succeeded       -> mark the invoice paid, clear any billing alert
// payment_intent.payment_failed  -> mark the invoice failed + raise a billing_alert
//   (surfaced on the admin dashboard).
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import type Stripe from 'stripe'
import { db } from '../firebase'
import { REGION, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '../config'
import { getStripe } from './stripe'

async function markInvoice(invoiceId: string, status: 'paid' | 'failed') {
  const ref = db.collection('invoices').doc(invoiceId)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.set({ status, reconciledAt: FieldValue.serverTimestamp() }, { merge: true })
  }
}

export const stripeWebhook = onRequest(
  { region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    if (typeof sig !== 'string') {
      res.status(400).send('Missing signature')
      return
    }

    let event: Stripe.Event
    try {
      // onRequest gives us the raw body on req.rawBody for signature verification.
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value())
    } catch (err) {
      logger.warn('stripeWebhook: signature verification failed', { err: String(err) })
      res.status(400).send('Invalid signature')
      return
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent
        const invoiceId = pi.metadata?.invoiceId
        if (invoiceId) await markInvoice(invoiceId, 'paid')
      } else if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as Stripe.PaymentIntent
        const invoiceId = pi.metadata?.invoiceId
        const familyId = pi.metadata?.familyId
        if (invoiceId) await markInvoice(invoiceId, 'failed')
        if (familyId) {
          await db.collection('billing_alerts').add({
            familyId,
            invoiceId: invoiceId ?? null,
            amountCents: pi.amount ?? 0,
            reason: 'payment_failed',
            createdAt: FieldValue.serverTimestamp(),
          })
        }
      }
      res.status(200).send('ok')
    } catch (err) {
      logger.error('stripeWebhook: handler error', { err: String(err) })
      res.status(500).send('handler error')
    }
  },
)
