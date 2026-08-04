// mail/{id} trigger: the client writes a `mail` request doc via notify(); this sends it.
//
// The client already computed the exact NotificationEvent + payload at the call site,
// so we persist and send THAT rather than re-deriving from a data diff. The doc id is
// the idempotency key: onDocumentCreated is at-least-once, so we transactionally claim
// the doc (pending -> sending) before calling Resend and never send a doc twice.

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase'
import { REGION, RESEND_API_KEY } from '../config'
import type { NotificationEvent } from '../shared/notifications-events'
import { renderEmail } from './templates'
import { resolveRecipients, type DocReader } from './recipients'
import { sendEmail } from './resend'

/** DocReader backed by the Admin SDK (bypasses security rules — trusted server code). */
const adminReader: DocReader = {
  async get(col, id) {
    const snap = await db.collection(col).doc(id).get()
    return snap.exists ? (snap.data() as Record<string, unknown>) : null
  },
}

export const onMailCreated = onDocumentCreated(
  { document: 'mail/{id}', region: REGION, secrets: [RESEND_API_KEY] },
  async (evt) => {
    const ref = evt.data?.ref
    if (!ref) return

    // Claim the doc so a duplicate delivery of this trigger is a no-op.
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.data()
      if (!data || data.status !== 'pending') return null
      tx.update(ref, { status: 'sending', attempts: FieldValue.increment(1) })
      return data as { event: NotificationEvent; attempts?: number }
    })
    if (!claimed) return // already handled (or not pending)

    const event = claimed.event
    try {
      const to = await resolveRecipients(adminReader, event)
      if (to.length === 0) {
        logger.warn('mail: no resolvable recipients', { type: event.type })
        await ref.update({ status: 'skipped', reason: 'no_recipients', sentAt: FieldValue.serverTimestamp() })
        return
      }

      const rendered = renderEmail(event)
      await sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        ical: rendered.ical
          ? { filename: 'invite.ics', content: rendered.ical.content, method: rendered.ical.method }
          : undefined,
        idempotencyKey: ref.id,
      })

      await ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp(), recipients: to })
    } catch (err) {
      logger.error('mail: send failed', { type: event.type, err: String(err) })
      // Leave a trail; a small ops job / manual retry can reset status to 'pending'.
      await ref.update({ status: 'error', error: String(err), sentAt: FieldValue.serverTimestamp() })
    }
  },
)
