// Cloud Storage security-rules tests.
//
// The bug these cover: profile-photos/** and intro-videos/** were `allow read: if isSignedIn()`.
// ANY signed-in account — including an applicant Lucy has REJECTED, or a bot that signed up
// thirty seconds ago and is still pending — could read every nanny's intro video and every
// FAMILY'S PROFILE PHOTO by URL. This app stores children's names and home addresses; family
// photos reaching unvetted accounts is a real privacy failure. Firestore was already correctly
// tighter (isApprovedMember() in firestore.rules), so Storage was the weak side of the same door.
//
// The fix is owner-OR-approved-member. The OWNER half is load-bearing, not a nicety: a nanny
// uploads her photo and intro video DURING ONBOARDING, while still pending (see
// src/pages/onboarding — the wizard is reachable from the holding page before approval), and
// must be able to see her own preview immediately. An approved-only rule would break the
// wizard for every applicant. That case is pinned below.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'

/**
 * ⚠️ EMULATOR LIMITATION — read before "fixing" the it.skip()s below.
 *
 * The Storage emulator does NOT resolve firestore.get() / firestore.exists() from storage
 * rules; the cross-service call always evaluates falsey, so any clause depending on it denies.
 * Verified with a controlled probe: one rules file, one seeded user, one file — `allow read: if
 * isSignedIn()` PASSED and the identical case with `firestore.get(...).data.approved == true`
 * appended returned storage/unauthorized. Same harness, same user; the only variable was the
 * cross-service lookup.
 *
 * Consequence for coverage, stated plainly rather than papered over:
 *   - The DENY half is genuinely covered and passing. Those are the privacy assertions that
 *     matter most, and they fail loudly against the old `isSignedIn()` rule.
 *   - The ALLOW half (approved member / admin can still read) CANNOT be verified locally. Those
 *     cases are it.skip()'d — NOT deleted and NOT rewritten to assert denial, which would bake
 *     an emulator artifact in as if it were intended behavior and would then "pass" against a
 *     rule that locks every approved user out of the directory.
 *
 * A deny-only suite cannot distinguish the correct rule from `allow read: if false`, so the
 * allow half needs verification against the real backend (staging) before this ships. Flagged
 * in the handoff.
 */

let testEnv: RulesTestEnvironment

const ADMIN = 'admin1'
const APPROVED_FAM = 'fam1'
const APPROVED_NANNY = 'nanny1'
/** Signed in, account exists, but Lucy has NOT approved them yet. */
const PENDING_NANNY = 'nannyPending'
/** Signed in, and Lucy explicitly REJECTED them. The headline case. */
const REJECTED_NANNY = 'nannyRejected'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'littlelamb-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(resolve(__dirname, '../storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
  // The storage rules read these users/{uid} docs via firestore.get(), so approval state
  // has to exist in Firestore for the storage rule to resolve.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', ADMIN), { uid: ADMIN, role: 'admin', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', APPROVED_FAM), { uid: APPROVED_FAM, role: 'family', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', APPROVED_NANNY), { uid: APPROVED_NANNY, role: 'nanny', approved: true, status: 'approved' })
    await setDoc(doc(db, 'users', PENDING_NANNY), { uid: PENDING_NANNY, role: 'nanny', approved: false, status: 'pending' })
    await setDoc(doc(db, 'users', REJECTED_NANNY), { uid: REJECTED_NANNY, role: 'nanny', approved: false, status: 'rejected' })
  })
})

function storageAs(uid: string | null) {
  const ctx = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()
  return ctx.storage()
}

/** Seed a file into the emulator bypassing rules, so read tests have something to read. */
async function seedFile(path: string, contentType: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.storage().ref(path).put(new Uint8Array([1, 2, 3]), { contentType })
  })
}

const FAM_PHOTO = `profile-photos/${APPROVED_FAM}/photo.jpg`
const NANNY_PHOTO = `profile-photos/${APPROVED_NANNY}/photo.jpg`
const PENDING_PHOTO = `profile-photos/${PENDING_NANNY}/photo.jpg`
const NANNY_VIDEO = `intro-videos/${APPROVED_NANNY}/intro.mp4`
const PENDING_VIDEO = `intro-videos/${PENDING_NANNY}/intro.mp4`

describe('storage reads — profile photos are not readable by every signed-in account', () => {
  beforeEach(async () => {
    await seedFile(FAM_PHOTO, 'image/jpeg')
    await seedFile(NANNY_PHOTO, 'image/jpeg')
  })

  it('DENIES a REJECTED applicant reading a family photo', async () => {
    // The headline privacy bug: Lucy declined this person, and they could still pull down
    // the photo of every family on the platform.
    await assertFails(storageAs(REJECTED_NANNY).ref(FAM_PHOTO).getDownloadURL())
  })

  it('DENIES a PENDING (unvetted) account reading a family photo', async () => {
    await assertFails(storageAs(PENDING_NANNY).ref(FAM_PHOTO).getDownloadURL())
  })

  it('DENIES an unauthenticated caller', async () => {
    await assertFails(storageAs(null).ref(FAM_PHOTO).getDownloadURL())
  })

  it.skip('ALLOWS an approved family to read an approved nanny photo (the directory)', async () => {
    await assertSucceeds(storageAs(APPROVED_FAM).ref(NANNY_PHOTO).getDownloadURL())
  })

  it.skip('ALLOWS an approved nanny to read a family photo', async () => {
    await assertSucceeds(storageAs(APPROVED_NANNY).ref(FAM_PHOTO).getDownloadURL())
  })

  it.skip('ALLOWS admin', async () => {
    await assertSucceeds(storageAs(ADMIN).ref(FAM_PHOTO).getDownloadURL())
  })
})

describe('storage reads — the OWNER half (onboarding must keep working)', () => {
  it('ALLOWS a PENDING nanny to read her OWN photo — wizard preview before approval', async () => {
    await seedFile(PENDING_PHOTO, 'image/jpeg')
    await assertSucceeds(storageAs(PENDING_NANNY).ref(PENDING_PHOTO).getDownloadURL())
  })

  it('ALLOWS a PENDING nanny to read her OWN intro video', async () => {
    await seedFile(PENDING_VIDEO, 'video/mp4')
    await assertSucceeds(storageAs(PENDING_NANNY).ref(PENDING_VIDEO).getDownloadURL())
  })

  it('still DENIES that pending nanny someone ELSE’s video', async () => {
    await seedFile(NANNY_VIDEO, 'video/mp4')
    await assertFails(storageAs(PENDING_NANNY).ref(NANNY_VIDEO).getDownloadURL())
  })
})

describe('storage reads — intro videos', () => {
  beforeEach(async () => {
    await seedFile(NANNY_VIDEO, 'video/mp4')
  })

  it('DENIES a rejected applicant', async () => {
    await assertFails(storageAs(REJECTED_NANNY).ref(NANNY_VIDEO).getDownloadURL())
  })

  it.skip('ALLOWS an approved family', async () => {
    await assertSucceeds(storageAs(APPROVED_FAM).ref(NANNY_VIDEO).getDownloadURL())
  })
})

describe('video MIME types — the rule must accept what the client accepts', () => {
  // src/lib/storage.ts gates on `file.type.startsWith('video/')`, but the rule only allowed
  // video/(mp4|quicktime|webm). An Android capture (video/3gpp) or a Matroska file passed every
  // client-side check, uploaded, and then died on a rules rejection surfaced as an opaque
  // Firebase error with no actionable message. Widened to video/* — the size cap is what
  // actually bounds abuse here.
  it('accepts video/mp4', async () => {
    await assertSucceeds(
      storageAs(APPROVED_NANNY)
        .ref(`intro-videos/${APPROVED_NANNY}/a.mp4`)
        .put(new Uint8Array([1]), { contentType: 'video/mp4' }),
    )
  })

  it('accepts video/3gpp (Android capture)', async () => {
    await assertSucceeds(
      storageAs(APPROVED_NANNY)
        .ref(`intro-videos/${APPROVED_NANNY}/a.3gp`)
        .put(new Uint8Array([1]), { contentType: 'video/3gpp' }),
    )
  })

  it('accepts video/x-matroska', async () => {
    await assertSucceeds(
      storageAs(APPROVED_NANNY)
        .ref(`intro-videos/${APPROVED_NANNY}/a.mkv`)
        .put(new Uint8Array([1]), { contentType: 'video/x-matroska' }),
    )
  })

  it('still REJECTS a non-video content type in the video path', async () => {
    await assertFails(
      storageAs(APPROVED_NANNY)
        .ref(`intro-videos/${APPROVED_NANNY}/evil.html`)
        .put(new Uint8Array([1]), { contentType: 'text/html' }),
    )
  })

  it('still REJECTS a write by a non-owner', async () => {
    await assertFails(
      storageAs(APPROVED_FAM)
        .ref(`intro-videos/${APPROVED_NANNY}/hijack.mp4`)
        .put(new Uint8Array([1]), { contentType: 'video/mp4' }),
    )
  })
})
