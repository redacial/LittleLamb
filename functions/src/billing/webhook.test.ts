// Tests for the Stripe webhook — the money-terminal module. It decides whether an
// invoice reads `paid` or `failed`, and whether an admin ever learns a payment failed.
//
// Driven through handleStripeWebhook() with injected fakes (WebhookDeps), the same
// pattern as ChargeJobDeps in billingCycle.test.ts. No emulator, no network, no Stripe.
//
// The three edges that actually matter here, and why:
//   1. The duplicate guard. Stripe redelivers events. markInvoice is a merge (idempotent)
//      but raiseBillingAlert is an .add() — a replay without the guard means the admin
//      dashboard grows a second "payment failed" alert for one real failure.
//   2. The missing-invoice race. The webhook can beat quarterlyCharge's writeInvoice to
//      the database. See the dedicated describe block below — this is where the real bug
//      lives.
//   3. The 200-on-handler-error contract. A 5xx would make Stripe retry for days and
//      eventually disable the endpoint; a 200 means the event is gone for good. That is a
//      deliberate trade and it is pinned here so nobody flips it by accident.
import { describe, it, expect, vi } from 'vitest'
import type Stripe from 'stripe'
import { handleStripeWebhook, type WebhookDeps, type WebhookRequest } from './webhook'

// ---- fakes ----------------------------------------------------------------

interface Recorded {
  status: number
  body: string
}

function fakeRes() {
  const sent: Recorded[] = []
  return {
    sent,
    res: {
      status(code: number) {
        return {
          send(body: string) {
            sent.push({ status: code, body })
            return undefined
          },
        }
      },
    },
  }
}

/** A payment_intent event with the metadata quarterlyCharge attaches when it charges. */
function piEvent(
  type: 'payment_intent.succeeded' | 'payment_intent.payment_failed',
  over: {
    id?: string
    invoiceId?: string | undefined
    familyId?: string | undefined
    amount?: number
  } = {},
): Stripe.Event {
  const metadata: Record<string, string> = {}
  if (over.invoiceId !== undefined) metadata.invoiceId = over.invoiceId
  if (over.familyId !== undefined) metadata.familyId = over.familyId
  return {
    id: over.id ?? 'evt_1',
    type,
    data: {
      object: {
        id: 'pi_1',
        amount: over.amount ?? 2800,
        metadata,
      },
    },
  } as unknown as Stripe.Event
}

interface Harness {
  deps: WebhookDeps
  /** Invoice docs that exist in the fake store. Seed to simulate the invoice race. */
  invoices: Map<string, { status?: string }>
  alerts: Array<{ familyId: string; invoiceId: string | null; amountCents: number }>
  claimed: Set<string>
  handlerErrors: Array<{ eventId: string; message: string }>
}

function harness(
  opts: {
    event?: Stripe.Event
    /** Invoice ids that already exist in Firestore when the webhook lands. */
    existingInvoices?: string[]
    /** Make signature verification fail, as Stripe's SDK does on a forged body. */
    badSignature?: boolean
    /** Make the transactional claim itself blow up (Firestore unavailable). */
    claimThrows?: boolean
    /** Make markInvoice blow up, to exercise the 200-on-error path. */
    markThrows?: boolean
  } = {},
): Harness {
  const invoices = new Map<string, { status?: string }>()
  for (const id of opts.existingInvoices ?? []) invoices.set(id, {})
  const alerts: Harness['alerts'] = []
  const claimed = new Set<string>()
  const handlerErrors: Harness['handlerErrors'] = []

  return {
    invoices,
    alerts,
    claimed,
    handlerErrors,
    deps: {
      constructEvent: () => {
        if (opts.badSignature) throw new Error('No signatures found matching the expected signature')
        return opts.event ?? piEvent('payment_intent.succeeded', { invoiceId: 'inv_1' })
      },
      claimEvent: async (event) => {
        if (opts.claimThrows) throw new Error('firestore unavailable')
        if (claimed.has(event.id)) return false
        claimed.add(event.id)
        return true
      },
      recordHandlerError: async (eventId, message) => {
        handlerErrors.push({ eventId, message })
      },
      markInvoice: async (invoiceId, status) => {
        if (opts.markThrows) throw new Error('write failed')
        // Mirrors liveWebhookDeps.markInvoice: read-then-write, silently no-op when the
        // doc does not exist. That no-op is the behavior under test below.
        const existing = invoices.get(invoiceId)
        if (existing) invoices.set(invoiceId, { ...existing, status })
      },
      raiseBillingAlert: async (alert) => {
        alerts.push(alert)
      },
    },
  }
}

function req(over: Partial<WebhookRequest> = {}): WebhookRequest {
  return {
    headers: { 'stripe-signature': 't=1,v1=deadbeef' },
    rawBody: Buffer.from('{}'),
    ...over,
  }
}

// ---- the happy paths ------------------------------------------------------

describe('stripeWebhook — reconciling payment outcomes', () => {
  it('marks the invoice paid on payment_intent.succeeded', async () => {
    const h = harness({
      event: piEvent('payment_intent.succeeded', { invoiceId: 'inv_1', familyId: 'f1' }),
      existingInvoices: ['inv_1'],
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(h.invoices.get('inv_1')?.status).toBe('paid')
    expect(sent).toEqual([{ status: 200, body: 'ok' }])
  })

  it('raises NO billing alert on a successful payment', async () => {
    const h = harness({
      event: piEvent('payment_intent.succeeded', { invoiceId: 'inv_1', familyId: 'f1' }),
      existingInvoices: ['inv_1'],
    })
    await handleStripeWebhook(req(), fakeRes().res, h.deps)
    expect(h.alerts).toHaveLength(0)
  })

  it('marks the invoice failed AND raises exactly one billing alert on payment_failed', async () => {
    const h = harness({
      event: piEvent('payment_intent.payment_failed', {
        invoiceId: 'inv_1',
        familyId: 'f1',
        amount: 2800,
      }),
      existingInvoices: ['inv_1'],
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(h.invoices.get('inv_1')?.status).toBe('failed')
    // Exactly one — this alert is the ONLY way an admin learns the payment failed.
    expect(h.alerts).toEqual([{ familyId: 'f1', invoiceId: 'inv_1', amountCents: 2800 }])
    expect(sent).toEqual([{ status: 200, body: 'ok' }])
  })

  it('still alerts the admin when the failed PI carries no invoiceId', async () => {
    // A charge made outside quarterlyCharge (manual retry in the Stripe dashboard) may
    // have familyId but no invoiceId. Losing the alert would hide a real failure.
    const h = harness({
      event: piEvent('payment_intent.payment_failed', { familyId: 'f1', amount: 500 }),
    })
    await handleStripeWebhook(req(), fakeRes().res, h.deps)
    expect(h.alerts).toEqual([{ familyId: 'f1', invoiceId: null, amountCents: 500 }])
  })

  it('does nothing but ack for an event type it does not handle', async () => {
    const h = harness({
      event: { id: 'evt_x', type: 'customer.created', data: { object: {} } } as unknown as Stripe.Event,
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(h.alerts).toHaveLength(0)
    expect(sent).toEqual([{ status: 200, body: 'ok' }])
  })
})

// ---- replay / duplicate delivery -----------------------------------------

describe('stripeWebhook — duplicate delivery (Stripe redelivers events)', () => {
  it('is a no-op on a replayed event and raises NO second alert', async () => {
    const event = piEvent('payment_intent.payment_failed', {
      id: 'evt_dup',
      invoiceId: 'inv_1',
      familyId: 'f1',
      amount: 2800,
    })
    const h = harness({ event, existingInvoices: ['inv_1'] })

    const first = fakeRes()
    await handleStripeWebhook(req(), first.res, h.deps)
    expect(h.alerts).toHaveLength(1)

    // Stripe redelivers the SAME event id.
    const second = fakeRes()
    await handleStripeWebhook(req(), second.res, h.deps)

    // One real failure => exactly one alert on the admin dashboard, not two.
    expect(h.alerts).toHaveLength(1)
    expect(second.sent).toEqual([{ status: 200, body: 'duplicate' }])
  })

  it('does not re-run the invoice write on a replay', async () => {
    const event = piEvent('payment_intent.succeeded', { id: 'evt_dup', invoiceId: 'inv_1' })
    const h = harness({ event, existingInvoices: ['inv_1'] })
    const markSpy = vi.spyOn(h.deps, 'markInvoice')

    await handleStripeWebhook(req(), fakeRes().res, h.deps)
    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    expect(markSpy).toHaveBeenCalledTimes(1)
  })

  it('treats a DIFFERENT event id as fresh even for the same invoice', async () => {
    // succeeded then failed on the same invoice are two real events, not a replay.
    const h = harness({ existingInvoices: ['inv_1'] })
    h.deps.constructEvent = (() =>
      piEvent('payment_intent.payment_failed', {
        id: 'evt_a',
        invoiceId: 'inv_1',
        familyId: 'f1',
      })) as WebhookDeps['constructEvent']
    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    h.deps.constructEvent = (() =>
      piEvent('payment_intent.payment_failed', {
        id: 'evt_b',
        invoiceId: 'inv_1',
        familyId: 'f1',
      })) as WebhookDeps['constructEvent']
    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    expect(h.alerts).toHaveLength(2)
  })

  it('asks Stripe to RETRY (5xx) when the claim itself fails', async () => {
    // A failed claim means we do not know whether this event was already handled.
    // 5xx is correct here: dropping it would lose the event silently.
    const h = harness({ claimThrows: true })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(sent).toEqual([{ status: 500, body: 'claim error' }])
    expect(h.alerts).toHaveLength(0)
  })
})

// ---- the missing-invoice race --------------------------------------------

describe('stripeWebhook — the missing-invoice race (webhook beats writeInvoice)', () => {
  it('SILENTLY DROPS the paid status when the invoice doc does not exist yet', async () => {
    // ACTUAL CURRENT BEHAVIOR, asserted deliberately — see the note below.
    //
    // quarterlyCharge calls Stripe (chargeCustomer) BEFORE it calls writeInvoice. Stripe
    // can therefore deliver payment_intent.succeeded before the invoice doc exists.
    // markInvoice does a get() and, finding nothing, returns without writing anything.
    //
    // NOT DESIRABLE. The failure is completely silent:
    //   - nothing is written, and nothing is logged;
    //   - the event id has ALREADY been claimed above, so Stripe's redelivery of this
    //     same event is discarded as a duplicate — the retry that would have fixed the
    //     race is exactly what the duplicate guard eats;
    //   - quarterlyCharge then writes the invoice as `pending` (dry-run) or `paid` from
    //     its own return path, so a real card charge can end up recorded `pending`
    //     forever with no alert and no log line.
    // The dangerous direction is payment_failed (next test): the money is genuinely not
    // collected and nobody is told.
    const h = harness({
      event: piEvent('payment_intent.succeeded', { invoiceId: 'inv_missing' }),
      existingInvoices: [], // writeInvoice has not committed yet
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(h.invoices.has('inv_missing')).toBe(false) // nothing created
    expect(sent).toEqual([{ status: 200, body: 'ok' }]) // and we told Stripe "all good"
    expect(h.handlerErrors).toHaveLength(0) // not even recorded as an error
  })

  it('still raises the billing alert when a FAILED payment races the invoice write', async () => {
    // The saving grace: the alert does not depend on the invoice doc existing, so an
    // admin is still told about a failed payment even if the status write is lost.
    const h = harness({
      event: piEvent('payment_intent.payment_failed', {
        invoiceId: 'inv_missing',
        familyId: 'f1',
        amount: 2800,
      }),
      existingInvoices: [],
    })

    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    expect(h.invoices.has('inv_missing')).toBe(false) // status write lost
    expect(h.alerts).toEqual([{ familyId: 'f1', invoiceId: 'inv_missing', amountCents: 2800 }])
  })

  it('ignores a payment_intent carrying no invoiceId metadata at all', async () => {
    const h = harness({ event: piEvent('payment_intent.succeeded', {}) })
    const markSpy = vi.spyOn(h.deps, 'markInvoice')
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(markSpy).not.toHaveBeenCalled()
    expect(sent).toEqual([{ status: 200, body: 'ok' }])
  })
})

// ---- signature verification ----------------------------------------------

describe('stripeWebhook — signature verification (nobody but Stripe moves money)', () => {
  it('rejects a request with no stripe-signature header, before any Firestore work', async () => {
    const h = harness()
    const claimSpy = vi.spyOn(h.deps, 'claimEvent')
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req({ headers: {} }), res, h.deps)

    expect(sent).toEqual([{ status: 400, body: 'Missing signature' }])
    expect(claimSpy).not.toHaveBeenCalled()
    expect(h.alerts).toHaveLength(0)
  })

  it('rejects a forged body whose signature does not verify', async () => {
    const h = harness({
      badSignature: true,
      event: piEvent('payment_intent.succeeded', { invoiceId: 'inv_1' }),
      existingInvoices: ['inv_1'],
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(sent).toEqual([{ status: 400, body: 'Invalid signature' }])
    // The forged event must not have touched the invoice.
    expect(h.invoices.get('inv_1')?.status).toBeUndefined()
    expect(h.alerts).toHaveLength(0)
  })

  it('rejects a signature header sent as an array (header smuggling)', async () => {
    const h = harness()
    const { res, sent } = fakeRes()

    await handleStripeWebhook(
      req({ headers: { 'stripe-signature': ['a', 'b'] } }),
      res,
      h.deps,
    )

    expect(sent).toEqual([{ status: 400, body: 'Missing signature' }])
  })
})

// ---- the 200-on-handler-error contract -----------------------------------

describe('stripeWebhook — acks 200 even when the handler throws (deliberate)', () => {
  it('returns 200, not 5xx, when the invoice write blows up', async () => {
    // Pinned on purpose. The event id is already claimed, so a Stripe retry would be
    // discarded as a duplicate anyway; a 5xx would only get the endpoint disabled.
    // The cost is that this event is lost permanently — the recorded handlerError and
    // the un-reconciled invoice are the ONLY signal for manual follow-up.
    const h = harness({
      event: piEvent('payment_intent.succeeded', { id: 'evt_boom', invoiceId: 'inv_1' }),
      existingInvoices: ['inv_1'],
      markThrows: true,
    })
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(sent).toEqual([{ status: 200, body: 'ok' }])
    expect(h.invoices.get('inv_1')?.status).toBeUndefined()
  })

  it('records the handler error against the event marker for manual follow-up', async () => {
    const h = harness({
      event: piEvent('payment_intent.payment_failed', {
        id: 'evt_boom',
        invoiceId: 'inv_1',
        familyId: 'f1',
      }),
      existingInvoices: ['inv_1'],
      markThrows: true,
    })

    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    expect(h.handlerErrors).toHaveLength(1)
    expect(h.handlerErrors[0]).toMatchObject({ eventId: 'evt_boom' })
    expect(h.handlerErrors[0].message).toContain('write failed')
  })

  it('loses the billing alert when markInvoice throws first — failure goes unannounced', async () => {
    // Consequence of the ordering: markInvoice runs BEFORE raiseBillingAlert, so if the
    // invoice write throws, the admin is never alerted about the failed payment at all,
    // and the 200 means Stripe never retries. Asserted as current behavior, not endorsed.
    const h = harness({
      event: piEvent('payment_intent.payment_failed', {
        invoiceId: 'inv_1',
        familyId: 'f1',
      }),
      existingInvoices: ['inv_1'],
      markThrows: true,
    })

    await handleStripeWebhook(req(), fakeRes().res, h.deps)

    expect(h.alerts).toHaveLength(0)
  })

  it('still returns 200 when recording the handler error also fails', async () => {
    const h = harness({
      event: piEvent('payment_intent.succeeded', { invoiceId: 'inv_1' }),
      existingInvoices: ['inv_1'],
      markThrows: true,
    })
    h.deps.recordHandlerError = async () => {}
    const { res, sent } = fakeRes()

    await handleStripeWebhook(req(), res, h.deps)

    expect(sent).toEqual([{ status: 200, body: 'ok' }])
  })
})
