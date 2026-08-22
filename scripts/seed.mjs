// Seed temp accounts + sample data into the Firebase EMULATOR suite so all three
// experiences (family, nanny, admin) can be viewed locally with real, clickable content.
//
//   1. Start emulators:  npm run emulators
//   2. In another shell: npm run seed
//   3. Run the app:      npm run dev   (env already points at emulators)
//
// This talks ONLY to the local emulators — it sets *_EMULATOR_HOST below and never touches
// any real Firebase project. The Admin SDK bypasses security rules, so it can write the
// approved/admin docs that the client signup flow deliberately cannot create.

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// --- Point the Admin SDK at the local emulators ----------------------------------------
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'littlelamb-demo'
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

initializeApp({ projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

const PASSWORD = 'lamb1234'

// Stable UIDs so re-running the seed is idempotent (overwrites instead of duplicating).
const FAMILY_UID = 'seed-family-001'
const NANNY_UID = 'seed-nanny-001'
const ADMIN_UID = 'seed-admin-001'
// A few extra nannies so the directory looks alive.
const NANNY2_UID = 'seed-nanny-002'
const NANNY3_UID = 'seed-nanny-003'
// Pending applicants so the admin dashboard has approval actions to show.
const PENDING_FAMILY_UID = 'seed-pending-family'
const PENDING_NANNY_UID = 'seed-pending-nanny'
// A second pending nanny parked at 'interview_scheduled'. The holding page's "Book your
// interview slot" CTA renders only when stage === 'interview_scheduled' AND config/calendly
// holds a URL. With only an under_review applicant seeded, that step of the funnel had TWO
// independent reasons to render nothing, so a local walkthrough looked like a bug in the CTA
// when the data simply never reached the stage. Seeding both stages makes the whole nanny
// funnel visible without hand-advancing anyone in the admin UI.
const INTERVIEW_NANNY_UID = 'seed-interview-nanny'

const now = FieldValue.serverTimestamp()

/** Calendar date N days from today, as a Date. Negative N is in the past. */
function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

/** YYYY-MM-DD, matching the `ymd()` the billing engine stores and queries on. */
function ymd(d) {
  return d.toISOString().slice(0, 10)
}

/** Create or overwrite an emulator auth user with a fixed uid. */
async function upsertAuthUser({ uid, email, displayName }) {
  try {
    await auth.deleteUser(uid)
  } catch {
    // not found — fine
  }
  await auth.createUser({ uid, email, password: PASSWORD, displayName, emailVerified: true })
}

function referralCode(uid) {
  return uid.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
}

/** users/{uid} — the trust-critical account doc routing keys off. */
function userDoc({ uid, role, email, fullName, phone, approved = true, status = 'approved', wizardComplete = true, stage }) {
  return {
    uid,
    role,
    email,
    fullName,
    phone,
    approved,
    status,
    wizardComplete,
    ...(stage ? { stage } : {}),
    referredBy: null,
    referralSource: null,
    referralCode: referralCode(uid),
    createdAt: now,
    updatedAt: now,
  }
}

async function seed() {
  console.log(`Seeding emulators for project "${PROJECT_ID}"...`)

  // ---- Auth users -----------------------------------------------------------------------
  await Promise.all([
    upsertAuthUser({ uid: FAMILY_UID, email: 'family@littlelamb.test', displayName: 'The Hartley Family' }),
    upsertAuthUser({ uid: NANNY_UID, email: 'nanny@littlelamb.test', displayName: 'Maya Brooks' }),
    upsertAuthUser({ uid: ADMIN_UID, email: 'admin@littlelamb.test', displayName: 'Lucy (Admin)' }),
    upsertAuthUser({ uid: NANNY2_UID, email: 'nanny2@littlelamb.test', displayName: 'Sofia Reyes' }),
    upsertAuthUser({ uid: NANNY3_UID, email: 'nanny3@littlelamb.test', displayName: 'Grace Okafor' }),
    upsertAuthUser({ uid: PENDING_FAMILY_UID, email: 'pending-family@littlelamb.test', displayName: 'The Nguyen Family' }),
    upsertAuthUser({ uid: PENDING_NANNY_UID, email: 'pending-nanny@littlelamb.test', displayName: 'Ella Thompson' }),
    upsertAuthUser({ uid: INTERVIEW_NANNY_UID, email: 'interview-nanny@littlelamb.test', displayName: 'Priya Raman' }),
  ])

  // ---- users/{uid} ----------------------------------------------------------------------
  const users = {
    [FAMILY_UID]: userDoc({ uid: FAMILY_UID, role: 'family', email: 'family@littlelamb.test', fullName: 'The Hartley Family', phone: '805-555-0142' }),
    [NANNY_UID]: userDoc({ uid: NANNY_UID, role: 'nanny', email: 'nanny@littlelamb.test', fullName: 'Maya Brooks', phone: '805-555-0188', stage: 'decision_made' }),
    [ADMIN_UID]: userDoc({ uid: ADMIN_UID, role: 'admin', email: 'admin@littlelamb.test', fullName: 'Lucy', phone: '805-555-0100' }),
    [NANNY2_UID]: userDoc({ uid: NANNY2_UID, role: 'nanny', email: 'nanny2@littlelamb.test', fullName: 'Sofia Reyes', phone: '805-555-0190', stage: 'decision_made' }),
    [NANNY3_UID]: userDoc({ uid: NANNY3_UID, role: 'nanny', email: 'nanny3@littlelamb.test', fullName: 'Grace Okafor', phone: '805-555-0191', stage: 'decision_made' }),
    // Pending applicants — approved=false, status=pending (admin dashboard surfaces these).
    [PENDING_FAMILY_UID]: userDoc({ uid: PENDING_FAMILY_UID, role: 'family', email: 'pending-family@littlelamb.test', fullName: 'The Nguyen Family', phone: '805-555-0160', approved: false, status: 'pending', wizardComplete: false }),
    [PENDING_NANNY_UID]: userDoc({ uid: PENDING_NANNY_UID, role: 'nanny', email: 'pending-nanny@littlelamb.test', fullName: 'Ella Thompson', phone: '805-555-0161', approved: false, status: 'pending', wizardComplete: false, stage: 'under_review' }),
    // Log in as this one to see the interview step of the holding page (needs config/calendly
    // below to be set, which it now is).
    [INTERVIEW_NANNY_UID]: userDoc({ uid: INTERVIEW_NANNY_UID, role: 'nanny', email: 'interview-nanny@littlelamb.test', fullName: 'Priya Raman', phone: '805-555-0162', approved: false, status: 'pending', wizardComplete: false, stage: 'interview_scheduled' }),
  }
  for (const [uid, data] of Object.entries(users)) {
    await db.collection('users').doc(uid).set(data)
  }

  // ---- families/{uid} -------------------------------------------------------------------
  await db.collection('families').doc(FAMILY_UID).set({
    uid: FAMILY_UID,
    photoURL: null,
    neighborhood: 'Mesa',
    children: [
      { name: 'Olive', age: '4', interests: 'painting, the beach' },
      { name: 'Theo', age: '7', interests: 'soccer, dinosaurs' },
    ],
    pets: 'One golden retriever, Biscuit',
    allergies: 'Theo has a mild peanut allergy',
    houseRules: 'No screens after 7pm. Shoes off indoors.',
    homeAddress: '1820 Cliff Dr, Santa Barbara, CA 93109',
    primaryEmail: 'family@littlelamb.test',
    phone: '805-555-0142',
    coParentName: 'Daniel Hartley',
    coParentEmail: 'daniel@littlelamb.test',
    specialNotes: 'Theo has soccer practice Tuesdays at 4pm.',
    hasPaymentMethod: true,
    // Billing-ready, so `npm run billing:local` actually produces an invoice instead of
    // silently finding nobody due. quarterlyCharge requires ALL THREE of stripeCustomerId,
    // hasPaymentMethod and a due nextChargeDate — omitting any one makes the dry-run a
    // no-op that looks like a pass. The customer id is a Stripe *test-mode* shape and is
    // never charged: billing:local runs with enabled=false unless --charge is passed.
    stripeCustomerId: 'cus_seedfamily001',
    // Deliberately in the past so the family is due on the very first local run.
    // NOTE: only ever do this in the emulator. The real backfill must schedule the first
    // charge in the FUTURE — a past date makes a family immediately due and backdates
    // cycleStart, sweeping every historical booking into a surprise first invoice.
    nextChargeDate: ymd(daysFromNow(-1)),
    cycleStart: ymd(daysFromNow(-90)),
    // $22-30/hr. The three seeded nannies below deliberately straddle this so the
    // match / out-of-budget paths are both visible without editing any data.
    rateRange: { minCents: 2200, maxCents: 3000 },
  })

  // ---- nannies/{uid} (public profiles; only approved nannies get a readable doc) ---------
  await db.collection('nannies').doc(NANNY_UID).set({
    uid: NANNY_UID,
    fullName: 'Maya Brooks',
    photoURL: null,
    bio: 'Westmont grad with six years caring for Santa Barbara families. Calm, creative, and big on outdoor play. CPR certified and comfortable with toddlers through tweens.',
    introVideoURL: null,
    yearsExperience: '6',
    personalStatement: 'I believe childcare is about presence — being fully there for the little moments.',
    selfBadges: ['pet_friendly', 'ages_0_2', 'ages_3_7', 'swim'],
    verifiedBadges: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    availability: [
      { day: 1, start: '15:00', end: '20:00' },
      { day: 2, start: '15:00', end: '20:00' },
      { day: 3, start: '15:00', end: '20:00' },
      { day: 4, start: '15:00', end: '20:00' },
      { day: 5, start: '12:00', end: '21:00' },
    ],
    rateRange: { minCents: 2500, maxCents: 3500 }, // overlaps the family budget -> match
  })
  await db.collection('nannies').doc(NANNY2_UID).set({
    uid: NANNY2_UID,
    fullName: 'Sofia Reyes',
    photoURL: null,
    bio: 'Early-childhood educator who loves messy art projects and reading aloud. Fluent in Spanish and English.',
    introVideoURL: null,
    yearsExperience: '4',
    personalStatement: 'Every child learns differently — my job is to meet them where they are.',
    selfBadges: ['ages_3_7', 'ages_8_12', 'homework', 'newborn'],
    verifiedBadges: ['cpr', 'background_check', 'interviewed'],
    availability: [
      { day: 0, start: '09:00', end: '17:00' },
      { day: 6, start: '09:00', end: '17:00' },
      { day: 3, start: '16:00', end: '21:00' },
    ],
    rateRange: { minCents: 1800, maxCents: 2200 }, // touches the low bound -> match ($22)
  })
  await db.collection('nannies').doc(NANNY3_UID).set({
    uid: NANNY3_UID,
    fullName: 'Grace Okafor',
    photoURL: null,
    bio: 'Pediatric nursing student and lifelong babysitter. Specializes in newborns and multiples. Gentle, organized, and unflappable.',
    introVideoURL: null,
    yearsExperience: '8',
    personalStatement: 'Parents deserve to feel completely at ease when they walk out the door.',
    selfBadges: ['ages_0_2', 'newborn', 'multiples'],
    verifiedBadges: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    availability: [
      { day: 1, start: '08:00', end: '14:00' },
      { day: 2, start: '08:00', end: '14:00' },
      { day: 4, start: '08:00', end: '14:00' },
    ],
    rateRange: { minCents: 4000, maxCents: 5000 }, // above the family budget -> soft-flagged
  })

  // ---- bookings -------------------------------------------------------------------------
  // A mix so every dashboard/list has content: an upcoming confirmed booking, a past one
  // (drives review prompts), a pending request awaiting the nanny, and an open/unmatched one.
  const bookings = [
    {
      id: 'seed-booking-upcoming',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: NANNY_UID, nannyName: 'Maya Brooks',
      date: '2026-06-16', startTime: '16:00', endTime: '20:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Dinner at 6, bedtime routine starts at 7:30.',
      status: 'confirmed', recurring: true, recurrenceId: 'rec-001',
    },
    {
      id: 'seed-booking-past',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: NANNY_UID, nannyName: 'Maya Brooks',
      date: '2026-06-02', startTime: '17:00', endTime: '21:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Date night — back by 9.',
      status: 'confirmed', recurring: false, recurrenceId: null,
    },
    {
      id: 'seed-booking-pending',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: NANNY_UID, nannyName: 'Maya Brooks',
      date: '2026-06-20', startTime: '10:00', endTime: '14:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Outside your usual hours — Saturday morning. Beach day with the kids if you are free!',
      status: 'pending', recurring: false, recurrenceId: null,
    },
    {
      id: 'seed-booking-open',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: null, nannyName: null,
      date: '2026-06-22', startTime: '09:00', endTime: '12:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Could not find an available nanny — open for pickup.',
      status: 'open', recurring: false, recurrenceId: null,
    },
  ]
  for (const b of bookings) {
    const { id, ...data } = b
    await db.collection('bookings').doc(id).set({ ...data, createdAt: now })
  }

  // ---- invoices (family billing page + admin billing) -----------------------------------
  await db.collection('invoices').doc('seed-invoice-q1').set({
    familyId: FAMILY_UID, familyName: 'The Hartley Family',
    quarterLabel: 'Q1 2026', subscriptionFee: 25, bookingCount: 11, bookingFees: 11,
    total: 36, status: 'paid', issuedAt: '2026-03-31', pdfPath: null,
  })

  // ---- config: badges master list -------------------------------------------------------
  await db.collection('config').doc('badges').set({
    self: [
      { id: 'pet_friendly', label: 'Pet-Friendly', type: 'self' },
      { id: 'ages_0_2', label: 'Ages 0–2', type: 'self' },
      { id: 'ages_3_7', label: 'Ages 3–7', type: 'self' },
      { id: 'ages_8_12', label: 'Ages 8–12', type: 'self' },
      { id: 'newborn', label: 'Newborn Experience', type: 'self' },
      { id: 'multiples', label: 'Twins & Multiples', type: 'self' },
      { id: 'homework', label: 'Homework Help', type: 'self' },
      { id: 'swim', label: 'Water-Safe', type: 'self' },
    ],
    verified: [
      { id: 'cpr', label: 'CPR Certified', type: 'verified' },
      { id: 'first_aid', label: 'First Aid Certified', type: 'verified' },
      { id: 'background_check', label: 'Background Checked', type: 'verified' },
      { id: 'interviewed', label: 'Interviewed', type: 'verified' },
    ],
  })

  // ---- config: calendly -----------------------------------------------------------------
  // The one that actually caused confusion. useCalendlyConfig has NO default URL on purpose —
  // an unset config means NannyHoldingPage hides the "Book your interview slot" CTA entirely,
  // because a missing button is recoverable but a 404ing one burns the applicant. Correct in
  // production, but it meant a local E2E showed no interview CTA and read as a broken feature.
  // Seeding any non-empty URL makes the CTA render so the funnel is walkable locally.
  //
  // This placeholder does NOT resolve — it is a stand-in so the button appears, not a working
  // booking page, and following it locally will 404. That is fine HERE and only here: this
  // script is emulator-only, and the whole point of the empty-means-hidden rule is to protect
  // real applicants, who never see this doc. Lucy sets the live link in Settings > Calendly,
  // which writes this same doc in the real project.
  await db.collection('config').doc('calendly').set({
    url: 'https://calendly.com/littlelamb-demo/interview-placeholder',
  })

  // ---- config: billing ------------------------------------------------------------------
  // Written EXPLICITLY rather than left to the hook's client-side default, so a local run
  // exercises the real "config doc exists and says don't charge" path. enabled:false is the
  // dry-run: quarterly billing computes totals and writes invoices but never touches a card.
  // Leaving the doc absent tested the fallback instead of the thing production actually reads.
  await db.collection('config').doc('billing').set({
    subscriptionCents: 2500,
    perBookingCents: 100,
    enabled: false,
  })

  // ---- config: policies -----------------------------------------------------------------
  // Mirrors DEFAULT_POLICIES in src/lib/policies.ts. Mirrored rather than imported because
  // this script is plain node with no TS loader. The app falls back to the same copy per-field
  // when the doc is missing, so this changes nothing visually — it seeds the doc admin edits
  // on Settings > Policies, so the editor opens on real saved content instead of a fallback
  // that silently reverts. Keep in sync with src/lib/policies.ts if that copy changes.
  await db.collection('config').doc('policies').set({
    platform: [
      'Treat every member of the community with kindness and respect.',
      'Communicate through the platform so the Little Lamb team can support you if anything comes up.',
      'Every nanny is background-checked and personally interviewed before their profile goes live.',
    ].join('\n'),
    family: [
      'Cancellations are made from your Calendar or Bookings page; your nanny is notified automatically.',
      'Quarterly billing covers the platform — wages are arranged directly with your nanny.',
    ].join('\n'),
    nanny: [
      'Keep your availability current so families only book times that work for you.',
      'Cancellations are handled with the Little Lamb team — message us and we’ll take care of it.',
    ].join('\n'),
  })

  console.log('\nSeed complete. Temp accounts (password for all: ' + PASSWORD + '):')
  console.log('  Family : family@littlelamb.test')
  console.log('  Nanny  : nanny@littlelamb.test')
  console.log('  Admin  : admin@littlelamb.test')
  console.log('  Nanny (interview stage) : interview-nanny@littlelamb.test')
  console.log('\nPlus 2 extra nannies, 3 pending applicants, and sample bookings/invoices.')
  console.log('Config seeded: badges, calendly, billing (enabled=false — dry run), policies.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
