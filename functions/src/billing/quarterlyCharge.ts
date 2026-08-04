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
  { schedule: 'every day 08:00', region: REGION, timeZone: 'America/Los_Angeles', secrets: [STRIPE_SECRET_KEY] },
  async () => {
    const { rates, enabled } = await loadRates()
    const now = new Date()

    // Families whose next charge date is due today or earlier.
    const due = await db.collection('families').where('nextChargeDate', '<=', ymd(now)).get()

    let invoiced = 0
    for (const doc of due.docs) {
      const fam = doc.data()
      const familyId = doc.id
      if (!fam.stripeCustomerId || fam.hasPaymentMethod !== true) continue

      // Count confirmed bookings in the cycle window [cycleStart, now].
      const cycleStart = typeof fam.cycleStart === 'string' ? fam.cycleStart : ymd(now)
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
          await getStripe().paymentIntents.create({
            amount: totalCents,
            currency: 'usd',
            customer: fam.stripeCustomerId,
            payment_method: undefined, // uses the customer's default PM
            off_session: true,
            confirm: true,
            metadata: { familyId, invoiceId: invoiceRef.id },
          })
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

      // Advance the family's cycle and, on failure, flag it for the admin dashboard.
      const next = new Date(now)
      next.setDate(next.getDate() + BILLING_DEFAULTS.cycleDays)
      await doc.ref.set(
        { nextChargeDate: ymd(next), cycleStart: ymd(now) },
        { merge: true },
      )
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

      // Queue the invoice email (subject to the same dry-run note in the doc).
      // (Family invoice email uses a lightweight mail doc; template kept minimal for now.)
      invoiced++
    }

    logger.info('quarterlyCharge complete', { invoiced, enabled })
  },
)
