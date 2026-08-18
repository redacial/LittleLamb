// Regression tests for the launch-blocking billing bug: `nextChargeDate` was only ever
// READ (the due-families query) or ADVANCED (after a charge) — nothing ever INITIALIZED
// it. Every family therefore sat with nextChargeDate === undefined, the due query matched
// zero docs, and the engine logged `invoiced:0` on every run while appearing to succeed.
//
// Two halves are covered:
//   1. initialBillingCycle() — the pure decision of what savePaymentMethod should write
//      when a card is saved (set on first card, NEVER reset on a card update).
//   2. runQuarterlyCharge() — the extracted engine, proving a family with a saved card is
//      actually selected and invoiced.
import { describe, it, expect } from 'vitest'
import { initialBillingCycle, ymd } from './quarterlyCharge'
import { runQuarterlyCharge, type ChargeJobFamily, type ChargeJobDeps } from './quarterlyCharge'
import type { BillingRates } from './types'
import type { NotificationEvent } from '../shared/notifications-events'

const rates: BillingRates = { subscriptionCents: 2500, perBookingCents: 100 }

// Fixed "now" so cycle arithmetic is deterministic. 2026-06-15 + 90d = 2026-09-13.
const NOW = new Date('2026-06-15T08:00:00.000Z')

describe('initialBillingCycle — seeding the cycle when a card is saved', () => {
  it('seeds nextChargeDate 90 days out when the family has no cycle yet', () => {
    const patch = initialBillingCycle({}, NOW)
    expect(patch).toEqual({ cycleStart: '2026-06-15', nextChargeDate: '2026-09-13' })
  })

  it('is the fix for the bug: a carded family becomes visible to the due query', () => {
    // Before the fix this returned null/undefined and the family was never billable.
    const patch = initialBillingCycle({ hasPaymentMethod: true }, NOW)
    expect(patch).not.toBeNull()
    expect(typeof patch?.nextChargeDate).toBe('string')
  })

  it('does NOT reset an existing cycle when the card is merely updated', () => {
    // Critical: re-seeding here would either push the charge date out (family billed
    // late / never, by repeatedly updating a card) or, with an earlier date, re-bill.
    const existing = { cycleStart: '2026-05-01', nextChargeDate: '2026-07-30' }
    expect(initialBillingCycle(existing, NOW)).toBeNull()
  })

  it('does not reset when only nextChargeDate is already set', () => {
    expect(initialBillingCycle({ nextChargeDate: '2026-07-30' }, NOW)).toBeNull()
  })

  it('seeds a cycle when a stale doc has cycleStart but no nextChargeDate', () => {
    // A half-written doc must still become billable, not stay invisible forever.
    const patch = initialBillingCycle({ cycleStart: '2026-05-01' }, NOW)
    expect(patch?.nextChargeDate).toBe('2026-09-13')
  })

  it('uses ymd() for formatting, not a bespoke date helper', () => {
    expect(initialBillingCycle({}, NOW)?.cycleStart).toBe(ymd(NOW))
  })
})

interface Harness {
  deps: ChargeJobDeps
  invoices: Array<{ familyId: string; totalCents: number; status: string }>
  advanced: Array<{ familyId: string; nextChargeDate: string; cycleStart: string }>
  mailed: NotificationEvent[]
}

function family(over: Partial<ChargeJobFamily> = {}): ChargeJobFamily {
  return {
    id: 'f1',
    familyName: 'Fam',
    stripeCustomerId: 'cus_123',
    hasPaymentMethod: true,
    nextChargeDate: '2026-06-15',
    cycleStart: '2026-03-17',
    ...over,
  }
}

function harness(families: ChargeJobFamily[], bookingCounts: Record<string, number> = {}): Harness {
  const invoices: Harness['invoices'] = []
  const advanced: Harness['advanced'] = []
  const mailed: NotificationEvent[] = []
  return {
    invoices,
    advanced,
    mailed,
    deps: {
      now: NOW,
      rates,
      enabled: false, // dry-run: never touches Stripe
      listDueFamilies: async () => families,
      countConfirmedBookings: async (familyId) => bookingCounts[familyId] ?? 0,
      claimCycle: async (familyId, _expected, next) => {
        advanced.push({ familyId, ...next })
        return true
      },
      newInvoiceId: () => 'inv_1',
      chargeCustomer: async () => {
        throw new Error('must not charge in dry-run')
      },
      renderPdf: async () => null,
      writeInvoice: async (inv, status) => {
        invoices.push({ familyId: inv.familyId, totalCents: inv.totalCents, status })
      },
      raiseBillingAlert: async () => {},
      enqueueMail: async (e) => {
        mailed.push(e)
      },
    },
  }
}

describe('runQuarterlyCharge — a carded family actually gets invoiced', () => {
  it('invoices a family that has a card and a due date', async () => {
    const h = harness([family()], { f1: 3 })
    const res = await runQuarterlyCharge(h.deps)

    expect(res.invoiced).toBe(1)
    expect(h.invoices).toHaveLength(1)
    expect(h.invoices[0].totalCents).toBe(2500 + 300)
  })

  it('advances the cycle by exactly 90 days when it charges', async () => {
    const h = harness([family()])
    await runQuarterlyCharge(h.deps)
    expect(h.advanced[0]).toMatchObject({
      familyId: 'f1',
      cycleStart: '2026-06-15',
      nextChargeDate: '2026-09-13',
    })
  })

  it('skips a family with no Stripe customer', async () => {
    const h = harness([family({ stripeCustomerId: null })])
    const res = await runQuarterlyCharge(h.deps)
    expect(res.invoiced).toBe(0)
    expect(h.invoices).toHaveLength(0)
  })

  it('skips a family whose card was never saved', async () => {
    const h = harness([family({ hasPaymentMethod: false })])
    expect((await runQuarterlyCharge(h.deps)).invoiced).toBe(0)
  })

  it('skips (does not invoice) when another run already claimed the cycle', async () => {
    const h = harness([family()])
    h.deps.claimCycle = async () => false
    const res = await runQuarterlyCharge(h.deps)
    expect(res.invoiced).toBe(0)
    expect(res.skipped).toBe(1)
    expect(h.invoices).toHaveLength(0)
  })

  it('queues exactly one invoice email per family per run', async () => {
    const h = harness([family(), family({ id: 'f2' })])
    await runQuarterlyCharge(h.deps)
    expect(h.mailed).toHaveLength(2)
    expect(h.mailed[0].type).toBe('quarterly_invoice')
  })

  it('writes the invoice as pending in dry-run (no Stripe call)', async () => {
    const h = harness([family()])
    await runQuarterlyCharge(h.deps)
    expect(h.invoices[0].status).toBe('pending')
  })
})
