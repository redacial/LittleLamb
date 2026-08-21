// Stripe webhook: reconcile payment outcomes back into Firestore. Signature-verified
// with the STRIPE_WEBHOOK_SECRET so only genuine Stripe events are honored.
//
// payment_intent.succeeded       -> mark the invoice paid, clear any billing alert
// payment_intent.payment_failed  -> mark the invoice failed + raise a billing_alert
//   (surfaced on the admin dashboard).
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
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
  /**
   * Merge the status into the invoice doc. Returns TRUE if the invoice existed and was
   * updated, FALSE if it does not exist yet (the writeInvoice race).
   *
   * MUST NOT create the doc when it is missing — see recordPendingReconciliation.
   */
  markInvoice(invoiceId: string, status: 'paid' | 'failed'): Promise<boolean>
  /**
   * Park a payment outcome durably, keyed by invoiceId, for an invoice that does not
   * exist yet. Drained onto the invoice once it appears.
   */
  recordPendingReconciliation(invoiceId: string, status: 'paid' | 'failed'): Promise<void>
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
      if (invoiceId) await reconcile(deps, invoiceId, 'paid')
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata?.invoiceId
      const familyId = pi.metadata?.familyId
      if (invoiceId) await reconcile(deps, invoiceId, 'failed')
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

/**
 * Apply a payment outcome to an invoice, without ever losing it.
 *
 * THE RACE: quarterlyCharge calls Stripe BEFORE it writes the invoice doc, so the webhook
 * can land first. The old code did a get(), found nothing, and returned — silently. The
 * event id was already claimed, so Stripe's redelivery got eaten by the duplicate guard,
 * and a genuinely-charged invoice stayed `pending` forever with no log line.
 *
 * WHY A SIDE COLLECTION rather than creating the invoice here: `invoices` is rendered
 * verbatim by the admin invoice list. A placeholder doc holding nothing but a status would
 * appear there as a real (blank, $0) invoice, and — worse — writing by id would RESURRECT
 * an invoice an admin had deliberately deleted. `invoice_reconciliations` is server-only
 * (no rules match => default deny), so nothing user-facing can ever render it.
 */
async function reconcile(
  deps: WebhookDeps,
  invoiceId: string,
  status: 'paid' | 'failed',
): Promise<void> {
  const applied = await deps.markInvoice(invoiceId, status)
  if (applied) return
  // Invoice not written yet. Park the outcome so writeInvoice (or the repair pass) can
  // pick it up. A throw here propagates to the handler's catch, which records it against
  // the event marker — losing this silently is the exact bug being fixed.
  logger.warn('stripeWebhook: invoice not written yet, parking reconciliation', {
    invoiceId,
    status,
  })
  await deps.recordPendingReconciliation(invoiceId, status)
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
      // update() rather than get()-then-set(): it fails with NOT_FOUND on a missing doc
      // instead of creating one, which is both atomic (no TOCTOU window between the read
      // and the write) and structurally incapable of producing a phantom invoice.
      const ref = db.collection('invoices').doc(invoiceId)
      try {
        await ref.update({ status, reconciledAt: FieldValue.serverTimestamp() })
        return true
      } catch (err) {
        const code = (err as { code?: number | string }).code
        // 5 === NOT_FOUND (gRPC). Anything else is a real failure and must propagate.
        if (code === 5 || code === 'not-found') return false
        throw err
      }
    },
    recordPendingReconciliation: async (invoiceId, status) => {
      // Keyed by invoiceId so a Stripe redelivery overwrites rather than duplicating, and
      // so the drain is a single get() by id. Server-only collection: no firestore.rules
      // match, so the default-deny at the bottom of the file covers it.
      await db
        .collection('invoice_reconciliations')
        .doc(invoiceId)
        .set(
          { invoiceId, status, recordedAt: FieldValue.serverTimestamp() },
          { merge: true },
        )
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

/** Collaborators for the drain, injected so the logic is testable without Firestore. */
export interface ParkedDeps {
  /** The parked status for this invoice, or null when there is none. */
  readParked(invoiceId: string): Promise<'paid' | 'failed' | null>
  /** Write the status onto the (now existing) invoice doc. */
  applyStatus(invoiceId: string, status: 'paid' | 'failed'): Promise<void>
  /** Delete the parked record. Only called AFTER applyStatus succeeds. */
  clearParked(invoiceId: string): Promise<void>
}

/**
 * Drain a parked payment outcome onto an invoice that has now been written.
 *
 * Stripe is the authority on whether money moved, so the parked status deliberately WINS
 * over whatever writeInvoice just recorded — in dry-run it writes `pending`, and its own
 * `paid`/`failed` return path is a guess made before the webhook confirmed anything.
 *
 * The clear happens only after the apply succeeds: clearing first would mean a transient
 * write error destroys the only durable record of a real payment, which is exactly the
 * loss this mechanism exists to prevent. Re-running is harmless — applyStatus is a merge.
 */
export async function applyParkedReconciliation(
  invoiceId: string,
  deps: ParkedDeps,
): Promise<void> {
  const parked = await deps.readParked(invoiceId)
  if (!parked) return
  await deps.applyStatus(invoiceId, parked)
  await deps.clearParked(invoiceId)
}

/** Wire the drain to the real Firestore. */
export function liveParkedDeps(): ParkedDeps {
  return {
    readParked: async (invoiceId) => {
      const snap = await db.collection('invoice_reconciliations').doc(invoiceId).get()
      const status = snap.data()?.status
      return status === 'paid' || status === 'failed' ? status : null
    },
    applyStatus: async (invoiceId, status) => {
      await db
        .collection('invoices')
        .doc(invoiceId)
        .set({ status, reconciledAt: FieldValue.serverTimestamp() }, { merge: true })
    },
    clearParked: async (invoiceId) => {
      await db.collection('invoice_reconciliations').doc(invoiceId).delete()
    },
  }
}

/**
 * Self-healing half of the race fix: the moment an invoice doc appears, apply any outcome
 * Stripe already told us about. Fires on create only — a later admin edit must not be
 * clobbered by a stale parked record (and there is none, since the drain deletes it).
 */
export const onInvoiceCreated = onDocumentCreated(
  { region: REGION, document: 'invoices/{invoiceId}' },
  async (event) => {
    const invoiceId = event.params.invoiceId
    try {
      await applyParkedReconciliation(invoiceId, liveParkedDeps())
    } catch (err) {
      // Left parked deliberately — a retry or the next create can still repair it.
      logger.error('onInvoiceCreated: draining parked reconciliation failed', {
        invoiceId,
        err: String(err),
      })
    }
  },
)

export const stripeWebhook = onRequest(
  { region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    await handleStripeWebhook(req, res, liveWebhookDeps())
  },
)
