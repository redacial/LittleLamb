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
