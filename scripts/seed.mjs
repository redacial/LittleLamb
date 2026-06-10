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
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

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

const now = FieldValue.serverTimestamp()

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

  // ---- conversations + messages ---------------------------------------------------------
  // Family <-> Admin thread.
  const convFamilyAdmin = 'seed-conv-family-admin'
  await db.collection('conversations').doc(convFamilyAdmin).set({
    participantIds: [FAMILY_UID, ADMIN_UID],
    participantNames: { [FAMILY_UID]: 'The Hartley Family', [ADMIN_UID]: 'Admin Team' },
    lastMessage: 'Welcome to Little Lamb! Let us know if you need anything.',
    lastMessageAt: now,
    status: 'read',
    kind: 'family_admin',
  })
  await db.collection('conversations').doc(convFamilyAdmin).collection('messages').add({
    conversationId: convFamilyAdmin, senderId: ADMIN_UID, senderRole: 'admin',
    body: 'Welcome to Little Lamb! Let us know if you need anything.', repliedBy: 'Lucy', createdAt: now,
  })

  // Nanny <-> Admin thread.
  const convNannyAdmin = 'seed-conv-nanny-admin'
  await db.collection('conversations').doc(convNannyAdmin).set({
    participantIds: [NANNY_UID, ADMIN_UID],
    participantNames: { [NANNY_UID]: 'Maya Brooks', [ADMIN_UID]: 'Admin Team' },
    lastMessage: 'Your profile looks great — you are all set to take bookings.',
    lastMessageAt: now,
    status: 'replied',
    kind: 'nanny_admin',
  })
  await db.collection('conversations').doc(convNannyAdmin).collection('messages').add({
    conversationId: convNannyAdmin, senderId: ADMIN_UID, senderRole: 'admin',
    body: 'Your profile looks great — you are all set to take bookings.', repliedBy: 'David', createdAt: now,
  })

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

  console.log('\nSeed complete. Temp accounts (password for all: ' + PASSWORD + '):')
  console.log('  Family : family@littlelamb.test')
  console.log('  Nanny  : nanny@littlelamb.test')
  console.log('  Admin  : admin@littlelamb.test')
  console.log('\nPlus 2 extra nannies, 2 pending applicants, and sample bookings/messages/invoices.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
