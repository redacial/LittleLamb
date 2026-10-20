// Demo-only: give every seeded nanny + family an illustrated avatar so the launch-video footage
// isn't a wall of initials. Runs AFTER `npm run seed`, talks ONLY to the local Firestore emulator.
// Avatars are DiceBear "notionists" (CC0, hand-drawn line art) on brand-token backgrounds, stored
// as SVG data URIs, so nothing is uploaded anywhere and no real person's photo is used.
//
//   NODE_PATH=<dir with @dicebear installed> node video-brief/tools/demo-photos.mjs

import { createRequire } from 'node:module'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const require = createRequire(process.env.DICEBEAR_DIR + '/package.json')
const { createAvatar } = require('@dicebear/core')
const { notionists } = require('@dicebear/collection')

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'littlelamb-demo' })
const db = getFirestore()

// ll-sage-light, ll-peri-light, ll-terra-light, ll-cream-dark
const BG = ['c8dec4', 'dde3f0', 'f0dfd0', 'ede6d8']

function avatar(seed, i) {
  const svg = createAvatar(notionists, { seed, backgroundColor: [BG[i % BG.length]], radius: 50 }).toString()
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

let i = 0
for (const col of ['nannies', 'families']) {
  const snap = await db.collection(col).get()
  for (const doc of snap.docs) {
    const url = avatar(doc.get('fullName') || doc.id, i++)
    await doc.ref.update({ photoURL: url })
    await db.collection('users').doc(doc.id).set({ photoURL: url }, { merge: true })
  }
  console.log(`${col}: ${snap.size} avatars`)
}

// Admin screens print each applicant's email; `pending-nanny@littlelamb.test` reads as test data
// on camera. Swap the DISPLAY email on users/families docs only — Auth logins are untouched.
const users = await db.collection('users').get()
for (const doc of users.docs) {
  const email = doc.get('email')
  if (!email?.endsWith('@littlelamb.test')) continue
  const name = (doc.get('fullName') || '').replace(/^The | Family$/g, '').toLowerCase()
  const local = doc.get('role') === 'family' ? `${name.replace(/\W/g, '')}family` : name.replace(/\s+/g, '.')
  const display = `${local || 'hello'}@gmail.com`
  await doc.ref.update({ email: display })
  const fam = db.collection('families').doc(doc.id)
  if ((await fam.get()).exists) await fam.update({ primaryEmail: display })
}
console.log('display emails updated')
