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
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The billing-cycle fields the engine's due query depends on. */
export interface BillingCyclePatch {
  cycleStart: string
  nextChargeDate: string
}

/**
 * Pure: the cycle fields to write when a family becomes billable (a card is saved).
 *
 * Returns `null` when the family already has a cycle — the caller must then write
 * NOTHING. This is the whole safety property: re-seeding on every card update would let
 * a family push their charge date out indefinitely by re-saving a card (never billed),
 * and seeding an earlier date could re-bill a cycle already charged.
 *
 * Without this, `nextChargeDate` was never initialized anywhere, so quarterlyCharge's
 * `where('nextChargeDate','<=',today)` query matched zero families on every run.
 */
export function initialBillingCycle(
  fam: { cycleStart?: unknown; nextChargeDate?: unknown } | undefined,
  now: Date,
): BillingCyclePatch | null {
  // Only nextChargeDate drives the due query, so its presence defines "already on a
  // cycle". A doc with cycleStart but no nextChargeDate is half-written and still
  // invisible to billing — seed it rather than leave it stranded forever.
  if (typeof fam?.nextChargeDate === 'string' && fam.nextChargeDate.length > 0) return null

  const next = new Date(now)
  next.setDate(next.getDate() + BILLING_DEFAULTS.cycleDays)
  return { cycleStart: ymd(now), nextChargeDate: ymd(next) }
}

/** The family fields the charge engine reads. */
export interface ChargeJobFamily {
  id: string
  familyName: string
  stripeCustomerId: string | null
  hasPaymentMethod: boolean
  /** The due date we selected on — used as the compare-and-set token when claiming. */
  nextChargeDate: string | null
  cycleStart: string | null
}

/**
 * Everything the engine touches that isn't pure. Injected so the billing logic is
 * unit-testable with no Firestore, no Stripe and no network — mirrors RecurringJobDeps
 * in ../scheduled/recurringCore.
 */
export interface ChargeJobDeps {
  now: Date
  rates: BillingRates
  /** false = dry-run: compute + record invoices, never call Stripe. */
  enabled: boolean
  listDueFamilies(dueOnOrBefore: string): Promise<ChargeJobFamily[]>
  countConfirmedBookings(familyId: string, since: string): Promise<number>
  /**
   * Transactionally advance the cycle, but only if nextChargeDate still equals
   * `expected`. Returns false if another run already claimed it.
   */
  claimCycle(familyId: string, expected: string | null, next: BillingCyclePatch): Promise<boolean>
  newInvoiceId(): string
  chargeCustomer(args: {
    customerId: string
    amountCents: number
    familyId: string
    invoiceId: string
  }): Promise<void>
  renderPdf(inv: InvoiceData): Promise<string | null>
  writeInvoice(inv: InvoiceData, status: 'paid' | 'pending' | 'failed', pdfPath: string | null): Promise<void>
  raiseBillingAlert(inv: InvoiceData): Promise<void>
  enqueueMail(event: NotificationEvent): Promise<void>
}

export interface ChargeJobResult {
  invoiced: number
  skipped: number
}

/**
 * The quarterly billing engine. Exported so it is directly testable and callable from a
 * one-off script; `quarterlyCharge` below is just the scheduler wrapper around it.
 */
export async function runQuarterlyCharge(deps: ChargeJobDeps): Promise<ChargeJobResult> {
  const { now, rates, enabled } = deps
  const due = await deps.listDueFamilies(ymd(now))

  let invoiced = 0
  let skipped = 0
  for (const fam of due) {
    const familyId = fam.id
    if (!fam.stripeCustomerId || fam.hasPaymentMethod !== true) continue

    const cycleStart = fam.cycleStart ?? ymd(now)

    // CLAIM THE CYCLE BEFORE CHARGING.
    // onSchedule can retry and a run can time out mid-loop, so advancing the cycle
    // *after* the Stripe call would double-charge. Instead we transactionally advance
    // nextChargeDate first, bailing if another run already moved it — the same
    // claim-then-act pattern as onMailCreated (email/send.ts). If the charge later
    // fails we deliberately do NOT roll the cycle back: the invoice is recorded
    // `failed` and raises a billing_alert for the admin to retry explicitly.
    const next = new Date(now)
    next.setDate(next.getDate() + BILLING_DEFAULTS.cycleDays)
    const claimed = await deps.claimCycle(familyId, fam.nextChargeDate, {
      cycleStart: ymd(now),
      nextChargeDate: ymd(next),
    })
    if (!claimed) {
      skipped++
      continue
    }

    // Count confirmed bookings in the cycle window [cycleStart, now].
    const confirmedBookings = await deps.countConfirmedBookings(familyId, cycleStart)

    const lineItems = invoiceLineItems(confirmedBookings, rates)
    const totalCents = computeInvoiceTotal(confirmedBookings, rates)

    const invoiceId = deps.newInvoiceId()
    const invoiceData: InvoiceData = {
      invoiceId,
      familyId,
      familyName: fam.familyName,
      periodStart: cycleStart,
      periodEnd: ymd(now),
      lineItems,
      totalCents,
    }

    let status: 'paid' | 'pending' | 'failed' = 'pending'
    if (enabled) {
      try {
        await deps.chargeCustomer({
          customerId: fam.stripeCustomerId,
          amountCents: totalCents,
          familyId,
          invoiceId,
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
      pdfPath = await deps.renderPdf(invoiceData)
    } catch (err) {
      logger.error('quarterlyCharge: pdf render failed', { familyId, err: String(err) })
    }

    await deps.writeInvoice(invoiceData, status, pdfPath)

    // (The cycle was already advanced by the claim above — see the comment there.)
    // On failure, flag it for the admin dashboard.
    if (status === 'failed') {
      await deps.raiseBillingAlert(invoiceData)
    }

    // Queue the invoice email. Same `mail` doc shape the client's notify() writes, so
    // onMailCreated picks it up unchanged and resolves recipients server-side. The
    // doc id is the send-idempotency key over there, and we only reach this line once
    // per cycle because of the claim above — so the family gets exactly one invoice email.
    try {
      await deps.enqueueMail({
        type: 'quarterly_invoice',
        to: 'family',
        familyId,
        familyName: invoiceData.familyName,
        invoiceId,
        periodStart: cycleStart,
        periodEnd: ymd(now),
        totalCents,
        bookingCount: confirmedBookings,
        pdfPath,
        dryRun: !enabled,
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
  return { invoiced, skipped }
}

/** Wire the engine to the real Firestore + Stripe. */
export function liveChargeDeps(rates: BillingRates, enabled: boolean, now: Date): ChargeJobDeps {
  return {
    now,
    rates,
    enabled,
    listDueFamilies: async (dueOnOrBefore) => {
      const snap = await db.collection('families').where('nextChargeDate', '<=', dueOnOrBefore).get()
      return snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          familyName: typeof d.familyName === 'string' ? d.familyName : 'Family',
          stripeCustomerId: typeof d.stripeCustomerId === 'string' ? d.stripeCustomerId : null,
          hasPaymentMethod: d.hasPaymentMethod === true,
          nextChargeDate: typeof d.nextChargeDate === 'string' ? d.nextChargeDate : null,
          cycleStart: typeof d.cycleStart === 'string' ? d.cycleStart : null,
        }
      })
    },
    countConfirmedBookings: async (familyId, since) => {
      const bk = await db
        .collection('bookings')
        .where('familyId', '==', familyId)
        .where('status', '==', 'confirmed')
        .where('date', '>=', since)
        .get()
      return bk.size
    },
    claimCycle: async (familyId, expected, next) => {
      const ref = db.collection('families').doc(familyId)
      return db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref)
        const d = fresh.data()
        if (!d) return false
        // Someone else advanced this family's cycle between our query and now.
        if ((typeof d.nextChargeDate === 'string' ? d.nextChargeDate : null) !== expected) return false
        tx.set(ref, next, { merge: true })
        return true
      })
    },
    newInvoiceId: () => db.collection('invoices').doc().id,
    chargeCustomer: async ({ customerId, amountCents, familyId, invoiceId }) => {
      await getStripe().paymentIntents.create(
        {
          amount: amountCents,
          currency: 'usd',
          customer: customerId,
          payment_method: undefined, // uses the customer's default PM
          off_session: true,
          confirm: true,
          metadata: { familyId, invoiceId },
        },
        // Second line of defence: if this call is retried (network blip, function
        // retry) Stripe returns the ORIGINAL PaymentIntent instead of charging again.
        // invoiceId is generated before the call, so it is stable across retries.
        { idempotencyKey: `invoice-${invoiceId}` },
      )
    },
    renderPdf: (inv) => renderInvoicePdf(inv),
    writeInvoice: async (inv, status, pdfPath) => {
      await db.collection('invoices').doc(inv.invoiceId).set({
        ...inv,
        status,
        pdfPath,
        dryRun: !enabled,
        createdAt: FieldValue.serverTimestamp(),
      })
    },
    raiseBillingAlert: async (inv) => {
      await db.collection('billing_alerts').add({
        familyId: inv.familyId,
        familyName: inv.familyName,
        invoiceId: inv.invoiceId,
        amountCents: inv.totalCents,
        reason: 'payment_failed',
        createdAt: FieldValue.serverTimestamp(),
      })
    },
    enqueueMail: async (event) => {
      await db.collection('mail').add({
        event,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      })
    },
  }
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
    await runQuarterlyCharge(liveChargeDeps(rates, enabled, new Date()))
  },
)
