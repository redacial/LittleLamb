import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

// Focused coverage of the rules ADDED/CHANGED this session: mail, families billing
// immutability, invoices, billing_alerts. (The pre-existing rules were audited in Phase 5.)

let testEnv: RulesTestEnvironment

const ADMIN = 'admin1'
const FAM = 'fam1'
const OTHER = 'fam2'
const NANNY = 'nanny1'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'littlelamb-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Seed the users docs the rules read for role/approval decisions.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', ADMIN), { uid: ADMIN, role: 'admin', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', FAM), { uid: FAM, role: 'family', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', OTHER), { uid: OTHER, role: 'family', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', NANNY), { uid: NANNY, role: 'nanny', approved: true, status: 'approved' })
    await setDoc(doc(db, 'families', FAM), { uid: FAM, hasPaymentMethod: false })
  })
})

function as(uid: string | null) {
  return uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore()
}

describe('mail collection', () => {
  it('a signed-in user may create a pending mail doc with a known event type', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'mail', 'm1'), {
        event: { type: 'booking_auto_confirmed' },
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('rejects an unknown event type', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'm2'), {
        event: { type: 'totally_made_up' },
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('rejects a non-pending status on create', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'm3'), {
        event: { type: 'application_approved' },
        status: 'sent',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('an unauthenticated user cannot create mail', async () => {
    await assertFails(
      setDoc(doc(as(null), 'mail', 'm4'), {
        event: { type: 'application_approved' },
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('a non-admin cannot read mail', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'mail', 'seed'), { event: { type: 'application_approved' }, status: 'pending' })
    })
    await assertFails(getDoc(doc(as(FAM), 'mail', 'seed')))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'mail', 'seed')))
  })
})

describe('families billing immutability', () => {
  it('a family cannot set hasPaymentMethod=true itself', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'families', FAM), { uid: FAM, hasPaymentMethod: true }, { merge: true }),
    )
  })

  it('a family cannot set stripeCustomerId itself', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'families', FAM), { uid: FAM, stripeCustomerId: 'cus_x' }, { merge: true }),
    )
  })

  it('a family CAN update non-billing profile fields', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'families', FAM), { uid: FAM, neighborhood: 'Mesa' }, { merge: true }),
    )
  })
})

describe('invoices + billing_alerts are admin-only writes', () => {
  it('a family cannot create an invoice', async () => {
    await assertFails(setDoc(doc(as(FAM), 'invoices', 'i1'), { familyId: FAM, status: 'paid' }))
  })

  it('a family cannot read another family invoice, admin can', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invoices', 'i2'), { familyId: OTHER, status: 'paid' })
    })
    await assertFails(getDoc(doc(as(FAM), 'invoices', 'i2')))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'invoices', 'i2')))
  })

  it('a family cannot read or write billing_alerts; admin can read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'billing_alerts', 'a1'), { familyId: FAM, reason: 'payment_failed' })
    })
    await assertFails(getDoc(doc(as(FAM), 'billing_alerts', 'a1')))
    await assertFails(setDoc(doc(as(FAM), 'billing_alerts', 'a2'), { familyId: FAM }))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'billing_alerts', 'a1')))
  })
})

// ---- pay rate ranges -------------------------------------------------------
// First coverage of the nannies collection, added with the pay-rate feature.
describe('rate ranges', () => {
  it('a nanny can set a well-formed rate range on their own profile', async () => {
    await assertSucceeds(
      setDoc(doc(as(NANNY), 'nannies', NANNY), {
        uid: NANNY,
        bio: 'hi',
        rateRange: { minCents: 2000, maxCents: 3000 },
      }),
    )
  })

  it('rejects an inverted range (min > max)', async () => {
    await assertFails(
      setDoc(doc(as(NANNY), 'nannies', NANNY), {
        uid: NANNY,
        rateRange: { minCents: 5000, maxCents: 2000 },
      }),
    )
  })

  it('rejects a rate above the $500/hr cap', async () => {
    await assertFails(
      setDoc(doc(as(NANNY), 'nannies', NANNY), {
        uid: NANNY,
        rateRange: { minCents: 2000, maxCents: 50001 },
      }),
    )
  })

  it('rejects a negative rate', async () => {
    await assertFails(
      setDoc(doc(as(NANNY), 'nannies', NANNY), {
        uid: NANNY,
        rateRange: { minCents: -100, maxCents: 2000 },
      }),
    )
  })

  it('rejects non-integer / non-map / extra-key rate shapes', async () => {
    await assertFails(
      setDoc(doc(as(NANNY), 'nannies', NANNY), { uid: NANNY, rateRange: { minCents: 20.5, maxCents: 3000 } }),
    )
    await assertFails(setDoc(doc(as(NANNY), 'nannies', NANNY), { uid: NANNY, rateRange: 2000 }))
    await assertFails(
      setDoc(doc(as(NANNY), 'nannies', NANNY), {
        uid: NANNY,
        rateRange: { minCents: 2000, maxCents: 3000, currency: 'usd' },
      }),
    )
  })

  it('a family can set its own budget range with the same validation', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'families', FAM), { uid: FAM, rateRange: { minCents: 1500, maxCents: 2500 } }, { merge: true }),
    )
    await assertFails(
      setDoc(doc(as(FAM), 'families', FAM), { uid: FAM, rateRange: { minCents: 9000, maxCents: 100 } }, { merge: true }),
    )
  })

  it('a family may snapshot a valid rate onto a booking it creates', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'bookings', 'bk1'), {
        familyId: FAM,
        date: '2026-09-01',
        rateMinCents: 2000,
        rateMaxCents: 2500,
        rateAgreed: true,
      }),
    )
    await assertFails(
      setDoc(doc(as(FAM), 'bookings', 'bk2'), {
        familyId: FAM,
        date: '2026-09-01',
        rateMinCents: 3000,
        rateMaxCents: 1000, // inverted
      }),
    )
  })

  it('neither party may rewrite the agreed rate after the fact; admin may', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'bookings', 'bk3'), {
        familyId: FAM,
        nannyId: NANNY,
        status: 'pending',
        rateMinCents: 2000,
        rateMaxCents: 2500,
        rateAgreed: true,
      })
    })
    // The nanny accepting is fine — as long as the rate snapshot is untouched.
    await assertSucceeds(
      setDoc(
        doc(as(NANNY), 'bookings', 'bk3'),
        { status: 'confirmed', rateMinCents: 2000, rateMaxCents: 2500, rateAgreed: true },
        { merge: true },
      ),
    )
    // Raising the rate on an existing booking must fail for both sides.
    await assertFails(
      setDoc(doc(as(NANNY), 'bookings', 'bk3'), { rateMaxCents: 9000 }, { merge: true }),
    )
    await assertFails(
      setDoc(doc(as(FAM), 'bookings', 'bk3'), { rateMinCents: 100 }, { merge: true }),
    )
    // Admin override still works (genuine corrections).
    await assertSucceeds(
      setDoc(doc(as(ADMIN), 'bookings', 'bk3'), { rateMaxCents: 9000 }, { merge: true }),
    )
  })
})
