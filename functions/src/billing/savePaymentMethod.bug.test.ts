// BUG PROOF (temporary, see note at bottom): drives the REAL savePaymentMethod callable
// against a fake Firestore + Stripe and asserts the outcome the billing engine requires:
// after a family saves a card, that family must be selectable by quarterlyCharge's due
// query, i.e. families/{uid}.nextChargeDate must exist.
//
// This fails on an ASSERTION against the shipped code (not a missing import), which is
// what makes it real evidence of the bug rather than evidence of a typo.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- fake Firestore -------------------------------------------------------
const store = new Map<string, Record<string, unknown>>()

function docHandle(path: string) {
  return {
    get: async () => ({
      exists: store.has(path),
      data: () => store.get(path),
    }),
    set: async (patch: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? (store.get(path) ?? {}) : {}
      store.set(path, { ...prev, ...patch })
    },
  }
}

vi.mock('../firebase', () => ({
  db: {
    collection: (col: string) => ({ doc: (id: string) => docHandle(`${col}/${id}`) }),
  },
  auth: {},
  storage: {},
}))

vi.mock('./stripe', () => ({
  getStripe: () => ({
    customers: {
      create: async () => ({ id: 'cus_fake' }),
      update: async () => ({}),
    },
    paymentMethods: { attach: async () => ({}) },
    setupIntents: { create: async () => ({ client_secret: 'seti_secret' }) },
  }),
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '__ts__' },
}))

// onCall returns the handler itself so we can invoke it directly.
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: unknown) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, msg: string) {
      super(msg)
    }
  },
}))

import { savePaymentMethod } from './setupIntent'

const UID = 'fam_1'
const req = { auth: { uid: UID, token: { email: 'a@b.com' } }, data: { paymentMethodId: 'pm_1' } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (r: unknown) => (savePaymentMethod as any)(r)

beforeEach(() => {
  store.clear()
  // A family that already has a Stripe customer (createSetupIntent ran) and is now
  // confirming their card — the exact state at the end of the onboarding wizard.
  store.set(`families/${UID}`, { stripeCustomerId: 'cus_fake', familyName: 'Fam' })
})

describe('savePaymentMethod must make the family billable', () => {
  it('sets nextChargeDate so quarterlyCharge can ever select this family', async () => {
    await call(req)
    const fam = store.get(`families/${UID}`)!

    // The engine's due query is: where('nextChargeDate','<=', today).
    // Without this field the family is invisible to billing forever.
    expect(fam.nextChargeDate).toBeDefined()
    expect(typeof fam.nextChargeDate).toBe('string')
  })

  it('sets cycleStart so the booking-count window has a lower bound', async () => {
    await call(req)
    expect(store.get(`families/${UID}`)!.cycleStart).toBeDefined()
  })

  it('still records hasPaymentMethod (existing behaviour preserved)', async () => {
    await call(req)
    expect(store.get(`families/${UID}`)!.hasPaymentMethod).toBe(true)
  })

  it('does not push out an existing cycle when the card is updated', async () => {
    store.set(`families/${UID}`, {
      stripeCustomerId: 'cus_fake',
      nextChargeDate: '2026-07-30',
      cycleStart: '2026-05-01',
    })
    await call(req)
    const fam = store.get(`families/${UID}`)!
    expect(fam.nextChargeDate).toBe('2026-07-30')
    expect(fam.cycleStart).toBe('2026-05-01')
  })
})
