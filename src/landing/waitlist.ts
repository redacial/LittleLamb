// Waitlist + contact submissions for the pre-launch landing site.
//
// Each submission is written to the `waitlist` Firestore collection (owned by our own
// Firebase project). Security rules make this collection PUBLIC-CREATE-ONLY / admin-read:
// anyone can add a signup, nobody but admin can read or list them (see firestore.rules).
//
// EMAIL NOTIFICATION: wired. A Cloud Function (functions/src/waitlist/onWaitlist.ts)
// triggers on `onDocumentCreated('waitlist/{id}')` and emails the team via Resend. It
// deploys with the rest of the backend once the project is on the Blaze plan; until
// then submissions are captured here and the email simply waits — nothing is lost.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { cleanLine, cleanText, isValidEmail, normalizeEmail, cleanPhone } from '../lib/sanitize'

export type WaitlistRole = 'family' | 'nanny'
export type SubmissionKind = 'waitlist' | 'contact'

export interface WaitlistInput {
  kind: SubmissionKind
  role: WaitlistRole
  name: string
  email: string
  phone?: string
  message?: string
}

export interface SubmitResult {
  ok: boolean
  error?: string
}

/**
 * Validate + sanitize + persist one waitlist or contact submission.
 * Client-side validation is for UX; Firestore rules enforce the hard shape server-side.
 */
export async function submitWaitlist(input: WaitlistInput): Promise<SubmitResult> {
  const name = cleanLine(input.name, 120)
  const email = normalizeEmail(input.email)
  const phone = input.phone ? cleanPhone(input.phone) : ''
  const message = input.message ? cleanText(input.message, 2000) : ''

  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' }
  if (input.role !== 'family' && input.role !== 'nanny') {
    return { ok: false, error: 'Please choose whether you are a family or a nanny.' }
  }
  if (input.kind === 'contact' && !message) {
    return { ok: false, error: 'Please enter a message.' }
  }

  const write = addDoc(collection(db, 'waitlist'), {
    kind: input.kind,
    role: input.role,
    name,
    email,
    phone,
    message,
    // Where the visitor was on the site when they submitted — light attribution.
    source: typeof window !== 'undefined' ? window.location.pathname : '',
    status: 'new',
    createdAt: serverTimestamp(),
  })

  try {
    // Firestore retries writes with backoff when the backend is unreachable, so addDoc can
    // hang indefinitely offline. Cap the wait so the visitor gets a clear error instead of an
    // endless spinner. A reachable backend resolves in well under a second.
    await Promise.race([
      write,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 12000),
      ),
    ])
    return { ok: true }
  } catch (err) {
    // Generic, non-leaking error (CLAUDE.md security rule). Log detail to console for debugging.
    console.error('waitlist submit failed', err)
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }
}
