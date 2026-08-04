// Thin wrapper over the Resend SDK. The client is constructed lazily inside the
// call so importing this module never requires a key — unit tests and the build
// stay green without RESEND_API_KEY, and the key is read from the bound secret only
// when an email is actually sent at runtime.
import { Resend } from 'resend'
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
