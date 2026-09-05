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
// Two more approved families (3 total) and nine more approved nannies (12 total), generated below
// from EXTRA_FAMILIES / EXTRA_NANNIES so the directory + booking flows have ranging test data:
// varied experience, rate floors that straddle each family's ceiling, different availability
// shapes, and every age-badge combination. UIDs stay stable for idempotent re-seeds.
const EXTRA_FAMILY_UIDS = ['seed-family-002', 'seed-family-003']
const EXTRA_NANNY_UIDS = Array.from({ length: 9 }, (_, i) => `seed-nanny-${String(i + 4).padStart(3, '0')}`)
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

/** Birthday `yearsOld` years + `plusDays` days ago, as a stored "YYYY-MM-DD". Relative → stable. */
function birthdayFor(yearsOld, plusDays = 0) {
  return ymd(daysFromNow(-365 * yearsOld - plusDays))
}

// ---- Two additional approved families (with the primary Hartley = 3 total) ---------------------
// Ranging: family sizes 1→4 kids, pets Y/N, and rate CEILINGs that make some nannies match and
// others sit above budget. Login emails follow family2@/family3@ so all three are usable.
const EXTRA_FAMILIES = [
  {
    uid: EXTRA_FAMILY_UIDS[0],
    fullName: 'The Nakamura Family',
    email: 'family2@littlelamb.test',
    phone: '805-555-0210',
    children: [{ name: 'Kai', birthday: birthdayFor(1, 40), interests: 'blocks, dogs' }],
    hasPets: false,
    allergies: '',
    houseRules: 'Nap at 12:30 sharp. Bottle in the fridge.',
    homeAddress: '340 Por La Mar Cir, Santa Barbara, CA 93103',
    coParentName: 'Jenna Nakamura',
    coParentEmail: 'jenna@littlelamb.test',
    emergencyContactName: 'Paul Nakamura (uncle)',
    emergencyContactPhone: '805-555-0211',
    // Low ceiling $22 → only the cheapest nannies match.
    rateCeilingCents: 2200,
  },
  {
    uid: EXTRA_FAMILY_UIDS[1],
    fullName: 'The Alvarez Family',
    email: 'family3@littlelamb.test',
    phone: '805-555-0220',
    children: [
      { name: 'Mateo', birthday: birthdayFor(3, 10), interests: 'trucks, soccer' },
      { name: 'Lucia', birthday: birthdayFor(6, 200), interests: 'reading, art' },
      { name: 'Diego', birthday: birthdayFor(9, 5), interests: 'basketball, Legos' },
      { name: 'Sol', birthday: birthdayFor(11, 120), interests: 'music, coding' },
    ],
    hasPets: true,
    petsNote: 'Two cats (Luna & Pepper) and a bearded dragon.',
    allergies: 'Lucia is lactose-intolerant.',
    houseRules: 'Homework before screens. Everyone helps with dinner cleanup.',
    homeAddress: '1512 Grand Ave, Santa Barbara, CA 93103',
    coParentName: 'Marisol Alvarez',
    coParentEmail: 'marisol@littlelamb.test',
    emergencyContactName: 'Rosa Alvarez (grandmother)',
    emergencyContactPhone: '805-555-0221',
    // High ceiling $50 → matches everyone, including the priciest nannies.
    rateCeilingCents: 5000,
  },
]

// ---- Nine additional approved nannies (with Maya/Sofia/Grace = 12 total) -----------------------
// Ranging: experience 1→15 yrs, floors $18→$45 (straddling every family ceiling), varied weekly
// availability (weekday evenings, weekend days, mornings, wide-open), and every age-badge combo so
// the directory shows the full Newborn/1-3/4-7/8+ spread. Verified-badge sets vary too.
const EXTRA_NANNIES = [
  { name: 'Hannah Kim', years: '2', floorCents: 1800, self: ['age_newborn', 'age_1_3', 'pet_friendly'], verified: ['background_check', 'interviewed'],
    bio: 'Nursing student who adores babies and toddlers. Patient, tidy, and great with bottle and nap routines.',
    availability: [{ day: 1, start: '08:00', end: '13:00' }, { day: 3, start: '08:00', end: '13:00' }, { day: 5, start: '08:00', end: '13:00' }] },
  { name: 'Olivia Bennett', years: '5', floorCents: 2400, self: ['age_1_3', 'age_4_7', 'swim'], verified: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    bio: 'Former preschool aide. Loves outdoor adventures, tide pools, and turning chores into games.',
    availability: [{ day: 1, start: '15:00', end: '20:00' }, { day: 2, start: '15:00', end: '20:00' }, { day: 4, start: '15:00', end: '20:00' }] },
  { name: 'Priya Sharma', years: '9', floorCents: 3200, self: ['age_4_7', 'age_8_plus', 'homework', 'multiples'], verified: ['cpr', 'background_check', 'interviewed'],
    bio: 'Certified tutor and longtime family manager. Homework, projects, and calm through the after-school chaos.',
    availability: [{ day: 1, start: '14:00', end: '19:00' }, { day: 2, start: '14:00', end: '19:00' }, { day: 3, start: '14:00', end: '19:00' }, { day: 4, start: '14:00', end: '19:00' }] },
  { name: 'Emma Thompson', years: '1', floorCents: 2000, self: ['age_4_7', 'age_8_plus'], verified: ['interviewed'],
    bio: 'Energetic Westmont freshman, all-star soccer coach for the neighborhood kids. Weekends are my thing.',
    availability: [{ day: 6, start: '09:00', end: '18:00' }, { day: 0, start: '10:00', end: '16:00' }] },
  { name: 'Naomi Carter', years: '12', floorCents: 4000, self: ['age_newborn', 'age_1_3', 'multiples', 'pet_friendly'], verified: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    bio: 'Newborn-care specialist and mother of twins. Sleep schedules and multiples are my superpower.',
    availability: [{ day: 1, start: '07:00', end: '15:00' }, { day: 2, start: '07:00', end: '15:00' }, { day: 3, start: '07:00', end: '15:00' }, { day: 4, start: '07:00', end: '15:00' }, { day: 5, start: '07:00', end: '15:00' }] },
  { name: 'Chloe Martin', years: '4', floorCents: 2600, self: ['age_1_3', 'age_4_7', 'swim', 'pet_friendly'], verified: ['cpr', 'background_check', 'interviewed'],
    bio: 'Art teacher by day. Messy projects, beach days, and a very good dog-sitter on the side.',
    availability: [{ day: 3, start: '16:00', end: '21:00' }, { day: 5, start: '16:00', end: '21:00' }, { day: 6, start: '10:00', end: '17:00' }] },
  { name: 'Sarah Nguyen', years: '7', floorCents: 3000, self: ['age_4_7', 'age_8_plus', 'homework', 'swim'], verified: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    bio: 'Elementary teacher on summer break. Reading, science experiments, and kids who leave a little smarter.',
    availability: [{ day: 1, start: '15:00', end: '21:00' }, { day: 3, start: '15:00', end: '21:00' }, { day: 5, start: '12:00', end: '21:00' }] },
  { name: 'Isabella Rossi', years: '15', floorCents: 4500, self: ['age_newborn', 'age_1_3', 'age_4_7', 'age_8_plus', 'multiples'], verified: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    bio: 'Career nanny, twenty families over fifteen years. Every age, every temperament — nothing surprises me.',
    availability: [{ day: 1, start: '08:00', end: '18:00' }, { day: 2, start: '08:00', end: '18:00' }, { day: 3, start: '08:00', end: '18:00' }, { day: 4, start: '08:00', end: '18:00' }, { day: 5, start: '08:00', end: '18:00' }] },
  { name: 'Zoe Williams', years: '3', floorCents: 2200, self: ['age_1_3', 'age_4_7', 'homework'], verified: ['background_check', 'interviewed'],
    bio: 'Grad student in child psychology. Gentle, curious, and endlessly patient with the tough days.',
    availability: [{ day: 2, start: '16:00', end: '20:00' }, { day: 4, start: '16:00', end: '20:00' }, { day: 0, start: '12:00', end: '18:00' }] },
]

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
    // The two extra families and nine extra nannies.
    ...EXTRA_FAMILIES.map((f) => upsertAuthUser({ uid: f.uid, email: f.email, displayName: f.fullName })),
    ...EXTRA_NANNIES.map((n, i) =>
      upsertAuthUser({ uid: EXTRA_NANNY_UIDS[i], email: `nanny${i + 4}@littlelamb.test`, displayName: n.name }),
    ),
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

  // users/{uid} for the extra approved families + nannies.
  for (const f of EXTRA_FAMILIES) {
    await db.collection('users').doc(f.uid).set(
      userDoc({ uid: f.uid, role: 'family', email: f.email, fullName: f.fullName, phone: f.phone }),
    )
  }
  for (let i = 0; i < EXTRA_NANNIES.length; i++) {
    const uid = EXTRA_NANNY_UIDS[i]
    const n = EXTRA_NANNIES[i]
    await db.collection('users').doc(uid).set(
      userDoc({ uid, role: 'nanny', email: `nanny${i + 4}@littlelamb.test`, fullName: n.name, phone: `805-555-${String(3000 + i).padStart(4, '0')}`, stage: 'decision_made' }),
    )
  }

  // ---- families/{uid} -------------------------------------------------------------------
  await db.collection('families').doc(FAMILY_UID).set({
    uid: FAMILY_UID,
    photoURL: null,
    // New profile shape (partner meeting 2026-09): kids by birthday, pets Y/N, emergency contact,
    // no neighborhood. Birthdays are RELATIVE so the computed ages stay sensible over time.
    children: [
      { name: 'Olive', birthday: ymd(daysFromNow(-365 * 4 - 90)), interests: 'painting, the beach' },
      { name: 'Theo', birthday: ymd(daysFromNow(-365 * 7 - 30)), interests: 'soccer, dinosaurs' },
    ],
    hasPets: true,
    petsNote: 'One golden retriever, Biscuit',
    allergies: 'Theo has a mild peanut allergy',
    houseRules: 'No screens after 7pm. Shoes off indoors.',
    homeAddress: '1820 Cliff Dr, Santa Barbara, CA 93109',
    primaryEmail: 'family@littlelamb.test',
    phone: '805-555-0142',
    coParentName: 'Daniel Hartley',
    coParentEmail: 'daniel@littlelamb.test',
    emergencyContactName: 'Ruth Hartley (grandmother)',
    emergencyContactPhone: '805-555-0177',
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
    // Family CEILING of $30/hr (single value now → {0, ceiling}). The three seeded nannies below
    // deliberately straddle it so the match / out-of-budget paths are both visible.
    rateRange: { minCents: 0, maxCents: 3000 },
  })

  // The two extra families. Not billing-configured (no stripeCustomerId/nextChargeDate) — only
  // the Hartleys drive the local billing run; these exist for the directory + booking flows.
  for (const f of EXTRA_FAMILIES) {
    await db.collection('families').doc(f.uid).set({
      uid: f.uid,
      photoURL: null,
      children: f.children,
      hasPets: f.hasPets,
      ...(f.petsNote ? { petsNote: f.petsNote } : {}),
      allergies: f.allergies ?? '',
      houseRules: f.houseRules ?? '',
      homeAddress: f.homeAddress,
      primaryEmail: f.email,
      phone: f.phone,
      coParentName: f.coParentName ?? '',
      coParentEmail: f.coParentEmail ?? '',
      emergencyContactName: f.emergencyContactName ?? '',
      emergencyContactPhone: f.emergencyContactPhone ?? '',
      hasPaymentMethod: true,
      rateRange: { minCents: 0, maxCents: f.rateCeilingCents },
    })
  }

  // ---- nannies/{uid} (public profiles; only approved nannies get a readable doc) ---------
  await db.collection('nannies').doc(NANNY_UID).set({
    uid: NANNY_UID,
    fullName: 'Maya Brooks',
    photoURL: null,
    bio: 'Westmont grad with six years caring for Santa Barbara families. Calm, creative, and big on outdoor play. CPR certified and comfortable with toddlers through tweens.',
    introVideoURL: null,
    yearsExperience: '6',
    personalStatement: 'I believe childcare is about presence — being fully there for the little moments.',
    selfBadges: ['pet_friendly', 'age_newborn', 'age_1_3', 'age_4_7', 'swim'],
    verifiedBadges: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    availability: [
      { day: 1, start: '15:00', end: '20:00' },
      { day: 2, start: '15:00', end: '20:00' },
      { day: 3, start: '15:00', end: '20:00' },
      { day: 4, start: '15:00', end: '20:00' },
      { day: 5, start: '12:00', end: '21:00' },
    ],
    rateRange: { minCents: 2500, maxCents: 50000 }, // floor $25 <= family ceiling $30 -> match
  })
  await db.collection('nannies').doc(NANNY2_UID).set({
    uid: NANNY2_UID,
    fullName: 'Sofia Reyes',
    photoURL: null,
    bio: 'Early-childhood educator who loves messy art projects and reading aloud. Fluent in Spanish and English.',
    introVideoURL: null,
    yearsExperience: '4',
    personalStatement: 'Every child learns differently — my job is to meet them where they are.',
    selfBadges: ['age_4_7', 'age_8_plus', 'homework'],
    verifiedBadges: ['cpr', 'background_check', 'interviewed'],
    availability: [
      { day: 0, start: '09:00', end: '17:00' },
      { day: 6, start: '09:00', end: '17:00' },
      { day: 3, start: '16:00', end: '21:00' },
    ],
    rateRange: { minCents: 2200, maxCents: 50000 }, // floor $22 <= family ceiling $30 -> match
  })
  await db.collection('nannies').doc(NANNY3_UID).set({
    uid: NANNY3_UID,
    fullName: 'Grace Okafor',
    photoURL: null,
    bio: 'Pediatric nursing student and lifelong babysitter. Specializes in newborns and multiples. Gentle, organized, and unflappable.',
    introVideoURL: null,
    yearsExperience: '8',
    personalStatement: 'Parents deserve to feel completely at ease when they walk out the door.',
    selfBadges: ['age_newborn', 'age_1_3', 'multiples'],
    verifiedBadges: ['cpr', 'first_aid', 'background_check', 'interviewed'],
    availability: [
      { day: 1, start: '08:00', end: '14:00' },
      { day: 2, start: '08:00', end: '14:00' },
      { day: 4, start: '08:00', end: '14:00' },
    ],
    rateRange: { minCents: 4000, maxCents: 50000 }, // floor $40 > family ceiling $30 -> soft-flagged
  })

  // The nine extra nannies (12 total in the directory). Each stores a single FLOOR as
  // {floor, RATE_MAX}; floors range $18–$45 so they straddle all three family ceilings.
  for (let i = 0; i < EXTRA_NANNIES.length; i++) {
    const uid = EXTRA_NANNY_UIDS[i]
    const n = EXTRA_NANNIES[i]
    await db.collection('nannies').doc(uid).set({
      uid,
      fullName: n.name,
      photoURL: null,
      bio: n.bio,
      introVideoURL: null,
      yearsExperience: n.years,
      personalStatement: '',
      selfBadges: n.self,
      verifiedBadges: n.verified,
      availability: n.availability,
      rateRange: { minCents: n.floorCents, maxCents: 50000 },
    })
  }

  // ---- bookings -------------------------------------------------------------------------
  // A mix so every dashboard/list has content. Dates are RELATIVE to today so "upcoming" is
  // actually upcoming (hardcoded literals rot). The pending/accept-decline status is gone
  // (partner meeting 2026-09): an out-of-hours request is now an `open` job-board post, and there
  // are two open posts so the nanny Job Board tab has content.
  const bookings = [
    {
      id: 'seed-booking-upcoming',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: NANNY_UID, nannyName: 'Maya Brooks',
      date: ymd(daysFromNow(10)), startTime: '16:00', endTime: '20:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Dinner at 6, bedtime routine starts at 7:30.',
      status: 'confirmed', recurring: true, recurrenceId: 'rec-001',
    },
    {
      id: 'seed-booking-past',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: NANNY_UID, nannyName: 'Maya Brooks',
      date: ymd(daysFromNow(-14)), startTime: '17:00', endTime: '21:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Date night — back by 9.',
      status: 'confirmed', recurring: false, recurrenceId: null,
    },
    {
      id: 'seed-booking-open-outofhours',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: null, nannyName: null,
      date: ymd(daysFromNow(6)), startTime: '10:00', endTime: '14:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Saturday morning beach day — outside anyone’s usual hours, open for pickup.',
      status: 'open', recurring: false, recurrenceId: null,
    },
    {
      id: 'seed-booking-open',
      familyId: FAMILY_UID, familyName: 'The Hartley Family',
      nannyId: null, nannyName: null,
      date: ymd(daysFromNow(8)), startTime: '09:00', endTime: '12:00',
      address: '1820 Cliff Dr, Santa Barbara, CA 93109',
      notes: 'Could not find an available nanny — open for pickup.',
      status: 'open', recurring: false, recurrenceId: null,
    },
    // Family 2 (Nakamura): one confirmed with Sofia, one open post from the whole network.
    {
      id: 'seed-booking-f2-confirmed',
      familyId: EXTRA_FAMILY_UIDS[0], familyName: 'The Nakamura Family',
      nannyId: NANNY2_UID, nannyName: 'Sofia Reyes',
      date: ymd(daysFromNow(5)), startTime: '09:00', endTime: '13:00',
      address: '340 Por La Mar Cir, Santa Barbara, CA 93103',
      notes: 'Kai naps at 12:30 — bottle is in the fridge.',
      status: 'confirmed', recurring: false, recurrenceId: null,
    },
    {
      id: 'seed-booking-f2-open',
      familyId: EXTRA_FAMILY_UIDS[0], familyName: 'The Nakamura Family',
      nannyId: null, nannyName: null,
      date: ymd(daysFromNow(9)), startTime: '18:00', endTime: '22:00',
      address: '340 Por La Mar Cir, Santa Barbara, CA 93103',
      notes: 'Anniversary dinner — evening sitter needed.',
      status: 'open', recurring: false, recurrenceId: null,
    },
    // Family 3 (Alvarez): a recurring confirmed with Priya, and a past one for reviews.
    {
      id: 'seed-booking-f3-recurring',
      familyId: EXTRA_FAMILY_UIDS[1], familyName: 'The Alvarez Family',
      nannyId: EXTRA_NANNY_UIDS[2], nannyName: 'Priya Sharma',
      date: ymd(daysFromNow(3)), startTime: '15:00', endTime: '18:00',
      address: '1512 Grand Ave, Santa Barbara, CA 93103',
      notes: 'After-school: homework first, then the park.',
      status: 'confirmed', recurring: true, recurrenceId: 'rec-002',
    },
    {
      id: 'seed-booking-f3-past',
      familyId: EXTRA_FAMILY_UIDS[1], familyName: 'The Alvarez Family',
      nannyId: EXTRA_NANNY_UIDS[2], nannyName: 'Priya Sharma',
      date: ymd(daysFromNow(-7)), startTime: '15:00', endTime: '18:00',
      address: '1512 Grand Ave, Santa Barbara, CA 93103',
      notes: 'The usual after-school routine.',
      status: 'confirmed', recurring: false, recurrenceId: null,
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
  // ONE flat `badges` array — the shape useBadgeCatalog actually reads (it looks at
  // snap.data().badges). The old seed wrote {self, verified}, which the hook ignored, so a fresh
  // env silently fell back to the code defaults. Age ranges updated 2026-09: Newborn / 1-3 / 4-7 /
  // 8+. Keep this in step with SELF_BADGES/VERIFIED_BADGES in src/lib/badges.ts.
  await db.collection('config').doc('badges').set({
    badges: [
      { id: 'pet_friendly', label: 'Pet-Friendly', type: 'self' },
      { id: 'age_newborn', label: 'Newborn', type: 'self' },
      { id: 'age_1_3', label: '1-3', type: 'self' },
      { id: 'age_4_7', label: '4-7', type: 'self' },
      { id: 'age_8_plus', label: '8+', type: 'self' },
      { id: 'multiples', label: 'Twins & Multiples', type: 'self' },
      { id: 'homework', label: 'Homework Help', type: 'self' },
      { id: 'swim', label: 'Water-Safe', type: 'self' },
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
  console.log('  Admin   : admin@littlelamb.test')
  console.log('  Families: family@ , family2@ , family3@   (@littlelamb.test)')
  console.log('  Nannies : nanny@ , nanny2@ … nanny12@      (@littlelamb.test)')
  console.log('  Pending : pending-family@ , pending-nanny@ , interview-nanny@')
  console.log('\n3 approved families + 12 approved nannies with ranging rates, ages, availability,')
  console.log('and badges. Bookings across all three families (confirmed / recurring / past / open).')
  console.log('Config seeded: badges, calendly, billing (enabled=false — dry run), policies.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
