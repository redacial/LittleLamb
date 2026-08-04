import { describe, it, expect } from 'vitest'
import { buildICalEvent, type ICalBooking } from './ical'

const booking: ICalBooking = {
  bookingId: 'abc123',
  familyName: 'The Hendersons',
  nannyName: 'Maria',
  date: '2026-06-14',
  startTime: '15:00',
  endTime: '20:00',
  address: '123 Olive St, Santa Barbara, CA',
}

// Split into logical (unfolded) lines for assertions.
function unfold(ics: string): string[] {
  return ics.replace(/\r\n[ \t]/g, '').split('\r\n')
}

describe('buildICalEvent', () => {
  it('wraps a single VEVENT in a VCALENDAR with REQUEST method', () => {
    const lines = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('METHOD:REQUEST')
    expect(lines).toContain('BEGIN:VEVENT')
    expect(lines).toContain('END:VEVENT')
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR')
  })

  it('emits floating-local DTSTART/DTEND from date + time', () => {
    const lines = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    expect(lines).toContain('DTSTART:20260614T150000')
    expect(lines).toContain('DTEND:20260614T200000')
  })

  it('DTSTAMP is UTC with a trailing Z', () => {
    const lines = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:34:56Z' }))
    expect(lines).toContain('DTSTAMP:20260601T123456Z')
  })

  it('derives a stable UID from bookingId, identical across REQUEST and CANCEL', () => {
    const req = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    const can = unfold(buildICalEvent(booking, { method: 'CANCEL', nowISO: '2026-06-01T12:00:00Z' }))
    const uid = 'UID:booking-abc123@littlelambnannies.com'
    expect(req).toContain(uid)
    expect(can).toContain(uid)
  })

  it('CANCEL sets STATUS:CANCELLED and a higher default SEQUENCE than REQUEST', () => {
    const req = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    const can = unfold(buildICalEvent(booking, { method: 'CANCEL', nowISO: '2026-06-01T12:00:00Z' }))
    expect(req).toContain('SEQUENCE:0')
    expect(req).toContain('STATUS:CONFIRMED')
    expect(can).toContain('METHOD:CANCEL')
    expect(can).toContain('SEQUENCE:1')
    expect(can).toContain('STATUS:CANCELLED')
  })

  it('escapes commas and semicolons in TEXT properties (LOCATION)', () => {
    const lines = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    const loc = lines.find((l) => l.startsWith('LOCATION:'))
    expect(loc).toBe('LOCATION:123 Olive St\\, Santa Barbara\\, CA')
  })

  it('includes ORGANIZER only when provided', () => {
    const withOrg = unfold(
      buildICalEvent(booking, { method: 'REQUEST', organizer: 'hello@littlelambnannies.com', nowISO: '2026-06-01T12:00:00Z' }),
    )
    expect(withOrg).toContain('ORGANIZER:mailto:hello@littlelambnannies.com')
    const withoutOrg = unfold(buildICalEvent(booking, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' }))
    expect(withoutOrg.some((l) => l.startsWith('ORGANIZER'))).toBe(false)
  })

  it('folds content lines longer than 75 octets (continuation begins with a space)', () => {
    const longAddr = 'A'.repeat(200)
    const raw = buildICalEvent({ ...booking, address: longAddr }, { method: 'REQUEST', nowISO: '2026-06-01T12:00:00Z' })
    // Raw output must contain a CRLF + space fold; every physical line <= 75 octets.
    expect(raw).toMatch(/\r\n /)
    for (const physical of raw.split('\r\n')) {
      expect(physical.length).toBeLessThanOrEqual(75)
    }
    // And it must still unfold back to a single LOCATION line with the full address.
    const loc = unfold(raw).find((l) => l.startsWith('LOCATION:'))
    expect(loc).toBe(`LOCATION:${longAddr}`)
  })
})
