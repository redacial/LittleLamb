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

/**
 * Dates relative to the machine clock. Hardcoded literals rot: a fixture written as
 * '2026-09-01' silently becomes a PAST date once that day arrives, and would then be rejected
 * by the very rule below — a test that passes today and fails next year for the wrong reason.
 */
function isoOffsetDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
        createdBy: FAM, // now required — see the createdBy suite below
      }),
    )
  })

  it('rejects an unknown event type', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'm2'), {
        event: { type: 'totally_made_up' },
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: FAM, // valid, so this can only fail on the event type
      }),
    )
  })

  it('rejects a non-pending status on create', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'm3'), {
        event: { type: 'application_approved' },
        status: 'sent',
        createdAt: serverTimestamp(),
        createdBy: FAM, // valid, so this can only fail on the status
      }),
    )
  })

  it('an unauthenticated user cannot create mail', async () => {
    await assertFails(
      // No uid exists to stamp, which is itself part of why this is rejected.
      setDoc(doc(as(null), 'mail', 'm4'), {
        event: { type: 'application_approved' },
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: FAM,
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

// ---- mail createdBy (per-user send quota depends on it) ---------------------
// The quota in onMailCreated meters by createdBy, so if that field could be omitted or
// forged the cap would be trivially evadable.
describe('mail createdBy attribution', () => {
  const validEvent = { type: 'booking_auto_confirmed' }

  it('accepts a mail doc stamped with the caller own uid', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'mail', 'q1'), {
        event: validEvent,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: FAM,
      }),
    )
  })

  it('rejects a mail doc with NO createdBy — unattributable sends cannot be metered', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'q2'), {
        event: validEvent,
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('rejects createdBy forged onto another user — the key evasion path', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'mail', 'q3'), {
        event: validEvent,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: OTHER,
      }),
    )
  })

  it('nobody can read or write mail_quota counters — a client could reset its own', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'mail_quota', FAM), { day: '2026-08-11', count: 5 })
    })
    await assertFails(getDoc(doc(as(FAM), 'mail_quota', FAM)))
    await assertFails(setDoc(doc(as(FAM), 'mail_quota', FAM), { day: '2026-08-11', count: 0 }))
    // Not even admin — this is server-only state, not an admin surface.
    await assertFails(getDoc(doc(as(ADMIN), 'mail_quota', FAM)))
  })
})

// The rules layer is the only one a buggy or malicious client cannot bypass. The client
// calendar refuses to open a past day and createBooking throws, but neither binds a direct
// SDK write. A past-dated booking is not merely untidy: inside the nanny's hours it resolved
// to 'confirmed' and emailed both parties a confirmation for childcare that never happened.
describe('bookings — a past date cannot be written', () => {
  it('rejects a booking dated yesterday', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'bookings', 'past1'), {
        familyId: FAM,
        date: isoOffsetDays(-1),
        startTime: '15:00',
        endTime: '19:00',
      }),
    )
  })

  it('rejects a booking dated well in the past', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'bookings', 'past2'), {
        familyId: FAM,
        date: '2020-01-01',
        startTime: '15:00',
        endTime: '19:00',
      }),
    )
  })

  it('allows today — same-day booking is supported, just routed to the job board', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'bookings', 'today1'), {
        familyId: FAM,
        date: isoOffsetDays(0),
        startTime: '15:00',
        endTime: '19:00',
      }),
    )
  })

  it('allows a future booking', async () => {
    await assertSucceeds(
      setDoc(doc(as(FAM), 'bookings', 'future1'), {
        familyId: FAM,
        date: isoOffsetDays(7),
        startTime: '15:00',
        endTime: '19:00',
      }),
    )
  })

  it('rejects a booking with no date at all, rather than defaulting it open', async () => {
    await assertFails(
      setDoc(doc(as(FAM), 'bookings', 'nodate'), { familyId: FAM, startTime: '15:00' }),
    )
  })
})
