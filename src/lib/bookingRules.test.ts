// Two live bugs motivated this module, both found by David walking the family flow.
//
// 1. A past date was not merely accepted — resolveBookingStatus only tested `date === today`,
//    so a past date inside the nanny's hours returned 'confirmed' and fired a
//    booking_auto_confirmed email to BOTH parties. A family got a confirmation for childcare
//    that had already not happened.
// 2. `today` was computed with toISOString(), which is UTC. After ~5pm Pacific the code's
//    "today" is already tomorrow, so a genuine same-day booking skipped same_day_review and
//    auto-confirmed — in exactly the evening hours Santa Barbara families book childcare.
import { describe, it, expect } from 'vitest'
import {
  todayISO,
  isPastDate,
  hoursUntil,
  canBook,
  isLateCancel,
  isWithinAvailability,
  MIN_LEAD_HOURS,
  FREE_CANCEL_HOURS,
} from './bookingRules'

describe('todayISO — local, never UTC', () => {
  it('uses the LOCAL calendar date, not the UTC one', () => {
    // 6:30pm Pacific on Aug 24 is already Aug 25 in UTC. The old
    // `new Date().toISOString().slice(0,10)` returned the 25th here — so an evening
    // same-day booking looked like tomorrow and skipped admin review.
    const evening = new Date('2026-08-24T18:30:00-07:00')
    expect(evening.toISOString().slice(0, 10)).toBe('2026-08-25') // the old, wrong answer
    expect(todayISO(evening)).toBe('2026-08-24') // the local answer a family would expect
  })

  it('zero-pads month and day so string comparison stays valid', () => {
    expect(todayISO(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })
})

describe('isPastDate', () => {
  it('rejects yesterday', () => {
    expect(isPastDate('2026-08-23', '2026-08-24')).toBe(true)
  })

  it('does NOT treat today as past — same-day is a real, supported booking', () => {
    expect(isPastDate('2026-08-24', '2026-08-24')).toBe(false)
  })

  it('accepts the future', () => {
    expect(isPastDate('2026-08-25', '2026-08-24')).toBe(false)
  })
})

describe('hoursUntil', () => {
  const now = new Date('2026-08-24T12:00:00-07:00')

  it('measures to the booking start, not to midnight', () => {
    expect(hoursUntil('2026-08-24', '18:00', now)).toBeCloseTo(6, 5)
  })

  it('goes negative once the start has passed', () => {
    expect(hoursUntil('2026-08-24', '09:00', now)).toBeCloseTo(-3, 5)
  })
})

describe('canBook — the guard that was missing entirely', () => {
  const now = new Date('2026-08-24T12:00:00-07:00')

  it('refuses a past date', () => {
    const r = canBook({ date: '2026-08-23', startTime: '15:00', now })
    expect(r.ok).toBe(false)
    expect(r.refusal).toBe('past-date')
  })

  it('allows a booking comfortably in the future', () => {
    expect(canBook({ date: '2026-09-01', startTime: '15:00', now }).ok).toBe(true)
  })

  // Inside the lead time the booking is still ALLOWED — it just can't auto-confirm against a
  // nanny who may never see it. Routing is resolveBookingStatus's job; this only reports.
  it('allows a booking inside the lead time but flags it as short notice', () => {
    const r = canBook({ date: '2026-08-24', startTime: '18:00', now })
    expect(r.ok).toBe(true)
    expect(r.shortNotice).toBe(true)
  })

  it('does not flag short notice outside the lead window', () => {
    const r = canBook({ date: '2026-08-26', startTime: '18:00', now })
    expect(r.ok).toBe(true)
    expect(r.shortNotice).toBe(false)
  })

  it('treats a start exactly at the lead boundary as short notice', () => {
    const r = canBook({ date: '2026-08-25', startTime: '12:00', now })
    expect(hoursUntil('2026-08-25', '12:00', now)).toBeCloseTo(MIN_LEAD_HOURS, 5)
    expect(r.shortNotice).toBe(true)
  })
})

describe('isLateCancel — the flag only; the policy is Lucy’s call', () => {
  const now = new Date('2026-08-24T12:00:00-07:00')

  it('is late inside the free-cancel window', () => {
    expect(isLateCancel('2026-08-24', '20:00', now)).toBe(true)
  })

  it('is not late with more than the window remaining', () => {
    expect(isLateCancel('2026-08-27', '20:00', now)).toBe(false)
  })

  it('uses the same threshold the constant declares', () => {
    expect(FREE_CANCEL_HOURS).toBe(24)
  })
})

describe('isWithinAvailability — extracted from two duplicate copies in FamilyCalendarPage', () => {
  // 2026-08-24 is a Monday (day 1).
  const monday = [{ day: 1, start: '15:00', end: '20:00' }]

  it('covers a slot fully inside the block', () => {
    expect(isWithinAvailability(monday, '2026-08-24', '16:00', '19:00')).toBe(true)
  })

  it('rejects a slot running past the block end', () => {
    expect(isWithinAvailability(monday, '2026-08-24', '19:00', '21:00')).toBe(false)
  })

  it('rejects the right time on the wrong weekday', () => {
    expect(isWithinAvailability(monday, '2026-08-25', '16:00', '19:00')).toBe(false)
  })

  it('is false when the nanny has no availability at all', () => {
    expect(isWithinAvailability(undefined, '2026-08-24', '16:00', '19:00')).toBe(false)
  })
})
