import { describe, it, expect } from 'vitest'
import { calendarInvite } from './notifications'

// The iCal generation itself is covered exhaustively by functions/src/shared/ical.test.ts
// (identical source). Here we only pin the client wrapper: it produces a valid VCALENDAR
// with the right method and the platform organizer.

const booking = {
  bookingId: 'b1',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-07-02',
  startTime: '09:00',
  endTime: '12:30',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

describe('calendarInvite', () => {
  it('produces a REQUEST VCALENDAR by default with the platform organizer', () => {
    const ics = calendarInvite(booking)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('METHOD:REQUEST')
    expect(ics).toContain('DTSTART:20260702T090000')
    expect(ics).toContain('DTEND:20260702T123000')
    expect(ics).toContain('ORGANIZER:mailto:hello@littlelambnannies.com')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('produces a CANCEL VCALENDAR when asked', () => {
    const ics = calendarInvite(booking, 'CANCEL')
    expect(ics).toContain('METHOD:CANCEL')
    expect(ics).toContain('STATUS:CANCELLED')
  })
})
