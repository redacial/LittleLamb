import { describe, it, expect } from 'vitest'
import { renderEmail } from './templates'
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEvent,
} from '../shared/notifications-events'

const bookingBase = {
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

/** One representative event per variant, so we can assert renderEmail handles all 12. */
const samples: NotificationEvent[] = [
  { type: 'booking_auto_confirmed', to: 'family+nanny', ...bookingBase },
  { type: 'booking_request_sent', to: 'family+nanny', ...bookingBase },
  { type: 'booking_request_accepted', to: 'family', ...bookingBase },
  { type: 'booking_request_declined', to: 'family', ...bookingBase },
  { type: 'open_booking_picked_up', to: 'family', ...bookingBase },
  { type: 'recurring_booking_auto_cancelled', to: 'family+nanny', ...bookingBase },
  { type: 'same_day_booking_outcome', to: 'family', outcome: 'confirmed', ...bookingBase },
  { type: 'booking_cancelled_by_family', to: 'nanny', ...bookingBase },
  { type: 'application_status_updated', to: 'nanny', userId: 'u1', fullName: 'Ada Lamb', stage: 'interview_scheduled' },
  { type: 'application_approved', to: 'nanny', userId: 'u1', fullName: 'Ada Lamb' },
  { type: 'application_rejected', to: 'family', userId: 'u2', fullName: 'Bea Fox' },
  { type: 'new_message', to: 'recipient', conversationId: 'c1', recipientId: 'r1', senderName: 'Admin Team', preview: 'Hi <there> & "you"' },
]

describe('renderEmail', () => {
  it('has a sample for every declared event type', () => {
    expect(samples.map((s) => s.type).sort()).toEqual([...NOTIFICATION_EVENT_TYPES].sort())
  })

  it('renders a non-empty subject + html for every variant', () => {
    for (const e of samples) {
      const r = renderEmail(e)
      expect(r.subject, e.type).toBeTruthy()
      expect(r.html, e.type).toContain('Little Lamb')
    }
  })

  it('attaches an iCal REQUEST for confirmation events', () => {
    for (const type of ['booking_auto_confirmed', 'booking_request_accepted', 'open_booking_picked_up']) {
      const r = renderEmail(samples.find((s) => s.type === type)!)
      expect(r.ical?.method, type).toBe('REQUEST')
      expect(r.ical?.content, type).toContain('BEGIN:VCALENDAR')
    }
  })

  it('attaches an iCal CANCEL for cancellation events', () => {
    for (const type of ['recurring_booking_auto_cancelled', 'booking_cancelled_by_family']) {
      const r = renderEmail(samples.find((s) => s.type === type)!)
      expect(r.ical?.method, type).toBe('CANCEL')
      expect(r.ical?.content, type).toContain('STATUS:CANCELLED')
    }
  })

  it('does not attach an iCal to a request-sent (awaiting reply) email', () => {
    const r = renderEmail(samples.find((s) => s.type === 'booking_request_sent')!)
    expect(r.ical).toBeUndefined()
  })

  it('same_day pending has no invite; confirmed carries one', () => {
    const pending = renderEmail({ type: 'same_day_booking_outcome', to: 'family', outcome: 'pending', ...bookingBase })
    const confirmed = renderEmail({ type: 'same_day_booking_outcome', to: 'family', outcome: 'confirmed', ...bookingBase })
    expect(pending.ical).toBeUndefined()
    expect(confirmed.ical?.method).toBe('REQUEST')
  })

  it('escapes HTML in interpolated user text (new_message preview)', () => {
    const r = renderEmail(samples.find((s) => s.type === 'new_message')!)
    expect(r.html).toContain('&lt;there&gt;')
    expect(r.html).not.toContain('<there>')
  })
})
