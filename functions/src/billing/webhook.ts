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

/**
 * Everything the webhook handler touches that isn't pure. Injected so the reconciliation
 * logic is unit-testable with no Firestore, no Stripe and no network — mirrors
 * ChargeJobDeps in ./quarterlyCharge.
 */
export interface WebhookDeps {
  /** Verify the Stripe signature and decode the event. MUST throw on a bad signature. */
  constructEvent(rawBody: unknown, signature: string): Stripe.Event
  /**
   * Transactionally claim the event id. Returns true if this is the first delivery,
   * false if a marker already exists (i.e. this is a Stripe redelivery).
   */
  claimEvent(event: Stripe.Event): Promise<boolean>
  /** Record a handler error against the already-claimed event marker. Never throws. */
  recordHandlerError(eventId: string, message: string): Promise<void>
  /** Set the invoice status. No-ops when the invoice doc does not exist. */
  markInvoice(invoiceId: string, status: 'paid' | 'failed'): Promise<void>
  raiseBillingAlert(alert: {
    familyId: string
    invoiceId: string | null
    amountCents: number
  }): Promise<void>
}

/** The subset of the HTTP request the handler reads. */
export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>
  rawBody: unknown
}

/** The subset of the HTTP response the handler writes. */
export interface WebhookResponse {
  status(code: number): { send(body: string): unknown }
}

/**
 * The webhook engine. Exported so it is directly testable; `stripeWebhook` below is just
 * the onRequest wrapper around it with the live collaborators.
 */
export async function handleStripeWebhook(
  req: WebhookRequest,
  res: WebhookResponse,
  deps: WebhookDeps,
): Promise<void> {
  const sig = req.headers['stripe-signature']
  if (typeof sig !== 'string') {
    res.status(400).send('Missing signature')
    return
  }

  let event: Stripe.Event
  try {
    // onRequest gives us the raw body on req.rawBody for signature verification.
    event = deps.constructEvent(req.rawBody, sig)
  } catch (err) {
    logger.warn('stripeWebhook: signature verification failed', { err: String(err) })
    res.status(400).send('Invalid signature')
    return
  }

  // Stripe redelivers events (and retries on any non-2xx). markInvoice is a merge and
  // so naturally idempotent, but the billing_alerts .add() is not — a redelivery would
  // raise a duplicate alert on the admin dashboard. Claim the event id first; if the
  // marker already exists this delivery is a replay and we ack without re-handling.
  try {
    const fresh = await deps.claimEvent(event)
    if (!fresh) {
      logger.info('stripeWebhook: duplicate event ignored', { id: event.id, type: event.type })
      res.status(200).send('duplicate')
      return
    }
  } catch (err) {
    logger.error('stripeWebhook: claim failed', { id: event.id, err: String(err) })
    // Couldn't claim — ask Stripe to retry rather than risk dropping the event.
    res.status(500).send('claim error')
    return
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata?.invoiceId
      if (invoiceId) await deps.markInvoice(invoiceId, 'paid')
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata?.invoiceId
      const familyId = pi.metadata?.familyId
      if (invoiceId) await deps.markInvoice(invoiceId, 'failed')
      if (familyId) {
        await deps.raiseBillingAlert({
          familyId,
          invoiceId: invoiceId ?? null,
          amountCents: pi.amount ?? 0,
        })
      }
    }
    res.status(200).send('ok')
  } catch (err) {
    logger.error('stripeWebhook: handler error', { id: event.id, type: event.type, err: String(err) })
    // Ack with 200 on a handler error. The event is already claimed above, so a Stripe
    // retry would be ignored as a duplicate anyway — returning 5xx would only make
    // Stripe retry for days and eventually disable the endpoint. The logged error (and
    // the invoice left un-reconciled) is the signal for manual follow-up.
    await deps.recordHandlerError(event.id, String(err))
    res.status(200).send('ok')
  }
}

/** Wire the engine to the real Firestore + Stripe. */
export function liveWebhookDeps(): WebhookDeps {
  return {
    constructEvent: (rawBody, signature) =>
      getStripe().webhooks.constructEvent(
        rawBody as Parameters<Stripe['webhooks']['constructEvent']>[0],
        signature,
        STRIPE_WEBHOOK_SECRET.value(),
      ),
    claimEvent: async (event) => {
      const marker = db.collection('stripe_events').doc(event.id)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(marker)
        if (snap.exists) return false
        tx.set(marker, {
          type: event.type,
          receivedAt: FieldValue.serverTimestamp(),
        })
        return true
      })
    },
    recordHandlerError: async (eventId, message) => {
      await db
        .collection('stripe_events')
        .doc(eventId)
        .set({ handlerError: message }, { merge: true })
        .catch(() => undefined)
    },
    markInvoice: async (invoiceId, status) => {
      const ref = db.collection('invoices').doc(invoiceId)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.set({ status, reconciledAt: FieldValue.serverTimestamp() }, { merge: true })
      }
    },
    raiseBillingAlert: async ({ familyId, invoiceId, amountCents }) => {
      await db.collection('billing_alerts').add({
        familyId,
        invoiceId,
        amountCents,
        reason: 'payment_failed',
        createdAt: FieldValue.serverTimestamp(),
      })
    },
  }
}

export const stripeWebhook = onRequest(
  { region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    await handleStripeWebhook(req, res, liveWebhookDeps())
  },
)
