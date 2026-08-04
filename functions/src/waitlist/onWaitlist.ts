// waitlist/{id} trigger: email the team when someone joins the pre-launch waitlist
// or sends a contact message from the landing site. Retires the deferred ">>> EMAIL
// HOOK <<<" in src/landing/waitlist.ts.
//
// The submission data is public-create-only (see firestore.rules); this function runs
// with admin privileges and only READS the new doc to build an internal notification —
// it never exposes the collection.

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { REGION, RESEND_API_KEY, ADMIN_EMAIL } from '../config'
import { sendEmail } from '../email/resend'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export const onWaitlistCreated = onDocumentCreated(
  { document: 'waitlist/{id}', region: REGION, secrets: [RESEND_API_KEY] },
  async (evt) => {
    const data = evt.data?.data()
    if (!data) return

    const kind = data.kind === 'contact' ? 'Contact message' : 'Waitlist signup'
    const subject = `${kind}: ${esc(data.name)} (${esc(data.role)})`
    const html = [
      `<h2>${esc(kind)}</h2>`,
      `<p><strong>Name:</strong> ${esc(data.name)}<br/>`,
      `<strong>Email:</strong> ${esc(data.email)}<br/>`,
      `<strong>Role:</strong> ${esc(data.role)}<br/>`,
      data.phone ? `<strong>Phone:</strong> ${esc(data.phone)}<br/>` : '',
      data.source ? `<strong>From:</strong> ${esc(data.source)}<br/>` : '',
      `</p>`,
      data.message ? `<p><strong>Message:</strong><br/>${esc(data.message)}</p>` : '',
    ].join('')

    try {
      await sendEmail({ to: [ADMIN_EMAIL], subject, html, idempotencyKey: `waitlist-${evt.params.id}` })
    } catch (err) {
      // Best-effort: a failed notification must not affect the captured signup.
      logger.error('waitlist notify failed', { err: String(err) })
    }
  },
)
