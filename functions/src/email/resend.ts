// Thin wrapper over the Resend SDK. The client is constructed lazily inside the
// call so importing this module never requires a key — unit tests and the build
// stay green without RESEND_API_KEY, and the key is read from the bound secret only
// when an email is actually sent at runtime.
import { Resend } from 'resend'
import { logger } from 'firebase-functions/v2'
import { RESEND_API_KEY, EMAIL_FROM } from '../config'

export interface OutboundEmail {
  to: string[]
  subject: string
  html: string
  /** Optional .ics calendar attachment (RFC 5545 string). */
  ical?: { filename: string; content: string; method: 'REQUEST' | 'CANCEL' }
  /** Idempotency key — the mail doc id, so at-least-once triggers don't double-send. */
  idempotencyKey?: string
}

let client: Resend | null = null
function getClient(): Resend {
  if (!client) {
    client = new Resend(RESEND_API_KEY.value())
  }
  return client
}

/** Send one email through Resend. Throws on provider error (caller records it). */
export async function sendEmail(msg: OutboundEmail): Promise<void> {
  // Local no-op transport. Lets the emulator exercise the whole pipeline — the claim
  // transaction, quota metering, recipient resolution, template render, iCal attachment —
  // without a single email leaving the machine. Sits above getClient() so a no-op run never
  // reads RESEND_API_KEY and works with no key configured at all.
  //
  // Deliberately requires BOTH the opt-in flag and FUNCTIONS_EMULATOR. The dangerous failure
  // is the inverse of the feature: MAIL_TRANSPORT leaking into a deployed environment and
  // silently killing every approval, booking confirmation and invoice. FUNCTIONS_EMULATOR is
  // set only by the emulator runtime and never by Cloud Run, so a stray flag in production is
  // inert rather than catastrophic. Pinned by a test in resend.test.ts.
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.MAIL_TRANSPORT === 'noop') {
    logger.info('mail: noop transport, not sent', {
      to: msg.to,
      subject: msg.subject,
      ical: msg.ical?.method ?? null,
    })
    return
  }

  const attachments = msg.ical
    ? [
        {
          filename: msg.ical.filename,
          content: Buffer.from(msg.ical.content).toString('base64'),
          contentType: `text/calendar; method=${msg.ical.method}; charset=utf-8`,
        },
      ]
    : undefined

  await getClient().emails.send(
    {
      from: EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      attachments,
    },
    msg.idempotencyKey ? { idempotencyKey: msg.idempotencyKey } : undefined,
  )
}
