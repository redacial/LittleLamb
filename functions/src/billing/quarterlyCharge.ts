// Quarterly billing engine. Written now but INERT: it only charges a real card when
// deployed on Blaze AND config/billing.enabled === true. Until then (and by default)
// it runs in dry-run mode — it still computes totals and writes `pending` invoices, but
// never calls Stripe to charge. This lets the whole pipeline be verified end-to-end in
// the emulator without moving money.
//
// The math is a pure helper (invoiceLineItems / computeInvoiceTotal) so it is unit-tested
// with no Firestore or Stripe.

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase'
import { REGION, STRIPE_SECRET_KEY, BILLING_DEFAULTS } from '../config'
import { getStripe } from './stripe'
import { renderInvoicePdf, type InvoiceData } from './invoicePdf'
import type { BillingRates, InvoiceLineItem } from './types'
import type { NotificationEvent } from '../shared/notifications-events'

/** Pure: the line items for a family's quarter. */
export function invoiceLineItems(confirmedBookings: number, rates: BillingRates): InvoiceLineItem[] {
  return [
    {
      label: 'Platform subscription (quarterly)',
      quantity: 1,
      unitCents: rates.subscriptionCents,
      amountCents: rates.subscriptionCents,
    },
    {
      label: 'Confirmed bookings',
      quantity: confirmedBookings,
      unitCents: rates.perBookingCents,
      amountCents: confirmedBookings * rates.perBookingCents,
    },
  ]
}

/** Pure: total in cents for a family's quarter. */
export function computeInvoiceTotal(confirmedBookings: number, rates: BillingRates): number {
  return invoiceLineItems(confirmedBookings, rates).reduce((sum, li) => sum + li.amountCents, 0)
}

/** Read billing rates from config/billing, falling back to defaults. */
async function loadRates(): Promise<{ rates: BillingRates; enabled: boolean }> {
  const snap = await db.collection('config').doc('billing').get()
  const d = snap.data() ?? {}
  return {
    rates: {
      subscriptionCents:
        typeof d.subscriptionCents === 'number' ? d.subscriptionCents : BILLING_DEFAULTS.subscriptionCents,
      perBookingCents:
        typeof d.perBookingCents === 'number' ? d.perBookingCents : BILLING_DEFAULTS.perBookingCents,
    },
    enabled: d.enabled === true, // default false — dry-run until explicitly turned on
  }
}

/** YYYY-MM-DD for a Date. */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const quarterlyCharge = onSchedule(
  {
    schedule: 'every day 08:00',
    region: REGION,
    timeZone: 'America/Los_Angeles',
    secrets: [STRIPE_SECRET_KEY],
    // Two overlapping runs must never both charge the same family. The per-family
    // transactional claim below is the real guard; this makes interleaving impossible.
    maxInstances: 1,
  },
  async () => {
    const { rates, enabled } = await loadRates()
    const now = new Date()

    // Families whose next charge date is due today or earlier.
    const due = await db.collection('families').where('nextChargeDate', '<=', ymd(now)).get()

    let invoiced = 0
    let skipped = 0
    for (const doc of due.docs) {
      const fam = doc.data()
      const familyId = doc.id
      if (!fam.stripeCustomerId || fam.hasPaymentMethod !== true) continue

      const dueDate = typeof fam.nextChargeDate === 'string' ? fam.nextChargeDate : null
      const cycleStart = typeof fam.cycleStart === 'string' ? fam.cycleStart : ymd(now)

      // CLAIM THE CYCLE BEFORE CHARGING.
      // onSchedule can retry and a run can time out mid-loop, so advancing the cycle
      // *after* the Stripe call would double-charge. Instead we transactionally advance
      // nextChargeDate first, bailing if another run already moved it — the same
      // claim-then-act pattern as onMailCreated (email/send.ts). If the charge later
      // fails we deliberately do NOT roll the cycle back: the invoice is recorded
      // `failed` and raises a billing_alert for the admin to retry explicitly.
      const next = new Date(now)
      next.setDate(next.getDate() + BILLING_DEFAULTS.cycleDays)
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref)
        const d = fresh.data()
        if (!d) return false
        // Someone else advanced this family's cycle between our query and now.
        if ((typeof d.nextChargeDate === 'string' ? d.nextChargeDate : null) !== dueDate) return false
        tx.set(doc.ref, { nextChargeDate: ymd(next), cycleStart: ymd(now) }, { merge: true })
        return true
      })
      if (!claimed) {
        skipped++
        continue
      }

      // Count confirmed bookings in the cycle window [cycleStart, now].
      const bk = await db
        .collection('bookings')
        .where('familyId', '==', familyId)
        .where('status', '==', 'confirmed')
        .where('date', '>=', cycleStart)
        .get()
      const confirmedBookings = bk.size

      const lineItems = invoiceLineItems(confirmedBookings, rates)
      const totalCents = computeInvoiceTotal(confirmedBookings, rates)

      const invoiceRef = db.collection('invoices').doc()
      const invoiceData: InvoiceData = {
        invoiceId: invoiceRef.id,
        familyId,
        familyName: typeof fam.familyName === 'string' ? fam.familyName : 'Family',
        periodStart: cycleStart,
        periodEnd: ymd(now),
        lineItems,
        totalCents,
      }

      let status: 'paid' | 'pending' | 'failed' = 'pending'
      if (enabled) {
        try {
          await getStripe().paymentIntents.create(
            {
              amount: totalCents,
              currency: 'usd',
              customer: fam.stripeCustomerId,
              payment_method: undefined, // uses the customer's default PM
              off_session: true,
              confirm: true,
              metadata: { familyId, invoiceId: invoiceRef.id },
            },
            // Second line of defence: if this call is retried (network blip, function
            // retry) Stripe returns the ORIGINAL PaymentIntent instead of charging again.
            // invoiceRef.id is generated before the call, so it is stable across retries.
            { idempotencyKey: `invoice-${invoiceRef.id}` },
          )
          status = 'paid'
        } catch (err) {
          logger.error('quarterlyCharge: payment failed', { familyId, err: String(err) })
          status = 'failed'
        }
      }

      // Render + store the invoice PDF (works in dry-run too).
      let pdfPath: string | null = null
      try {
        pdfPath = await renderInvoicePdf(invoiceData)
      } catch (err) {
        logger.error('quarterlyCharge: pdf render failed', { familyId, err: String(err) })
      }

      await invoiceRef.set({
        ...invoiceData,
        status,
        pdfPath,
        dryRun: !enabled,
        createdAt: FieldValue.serverTimestamp(),
      })

      // (The cycle was already advanced by the claim above — see the comment there.)
      // On failure, flag it for the admin dashboard.
      if (status === 'failed') {
        await db.collection('billing_alerts').add({
          familyId,
          familyName: invoiceData.familyName,
          invoiceId: invoiceRef.id,
          amountCents: totalCents,
          reason: 'payment_failed',
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      // Queue the invoice email. Same `mail` doc shape the client's notify() writes, so
      // onMailCreated picks it up unchanged and resolves recipients server-side. The
      // doc id is the send-idempotency key over there, and we only reach this line once
      // per cycle because of the claim above — so the family gets exactly one invoice email.
      try {
        const event: NotificationEvent = {
          type: 'quarterly_invoice',
          to: 'family',
          familyId,
          familyName: invoiceData.familyName,
          invoiceId: invoiceRef.id,
          periodStart: cycleStart,
          periodEnd: ymd(now),
          totalCents,
          bookingCount: confirmedBookings,
          pdfPath,
          dryRun: !enabled,
        }
        await db.collection('mail').add({
          event,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        // Never let a mail-queue failure abort the billing run — the invoice is already
        // written and the cycle already claimed.
        logger.error('quarterlyCharge: invoice email enqueue failed', {
          familyId,
          err: String(err),
        })
      }

      invoiced++
    }

    logger.info('quarterlyCharge complete', { invoiced, skipped, enabled })
  },
)
