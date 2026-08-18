// The local no-op transport, and — more importantly — proof that it CANNOT engage in production.
//
// The whole point of this seam is to exercise the real mail pipeline (claim transaction, quota,
// recipient resolution, template render, iCal) against the emulator without any outbound email.
// The failure mode that matters is the inverse one: MAIL_TRANSPORT leaking into a deployed
// environment and silently killing every email. So the guard requires BOTH the opt-in flag and
// FUNCTIONS_EMULATOR, which only the emulator runtime ever sets.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const send = vi.fn(async () => ({ data: { id: 'msg_1' }, error: null }))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))
vi.mock('../config', () => ({
  RESEND_API_KEY: { value: () => 're_test_key' },
  EMAIL_FROM: 'Little Lamb Nannies <hello@littlelambnannies.com>',
}))

const msg = { to: ['parent@example.com'], subject: 'Booking confirmed', html: '<p>hi</p>' }

/** Import fresh each time so the module-level Resend client never leaks between cases. */
async function loadSendEmail() {
  vi.resetModules()
  return (await import('./resend')).sendEmail
}

describe('sendEmail transport guard', () => {
  const env = { ...process.env }
  beforeEach(() => send.mockClear())
  afterEach(() => {
    process.env = { ...env }
  })

  it('skips the provider when running in the emulator with MAIL_TRANSPORT=noop', async () => {
    process.env.FUNCTIONS_EMULATOR = 'true'
    process.env.MAIL_TRANSPORT = 'noop'
    const sendEmail = await loadSendEmail()

    await sendEmail(msg)

    expect(send).not.toHaveBeenCalled()
  })

  // The safety property. A stray MAIL_TRANSPORT=noop in a deployed environment must be inert,
  // because FUNCTIONS_EMULATOR is set only by the emulator runtime — never by Cloud Run.
  it('STILL SENDS when MAIL_TRANSPORT=noop leaks into a deployed environment', async () => {
    delete process.env.FUNCTIONS_EMULATOR
    process.env.MAIL_TRANSPORT = 'noop'
    const sendEmail = await loadSendEmail()

    await sendEmail(msg)

    expect(send).toHaveBeenCalledOnce()
  })

  it('sends normally in the emulator when the flag is not set', async () => {
    process.env.FUNCTIONS_EMULATOR = 'true'
    delete process.env.MAIL_TRANSPORT
    const sendEmail = await loadSendEmail()

    await sendEmail(msg)

    expect(send).toHaveBeenCalledOnce()
  })
})
