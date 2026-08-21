import { describe, it, expect } from 'vitest'
import { findRecurringConflicts, resolveRecurring, type AvailabilityByNanny } from './recurring'
import type { AvailabilityBlock, Booking } from '../types'

// Fixed "now" so the 48h window is deterministic. 2026-06-15 is a Monday (getDay() === 1).
const NOW = '2026-06-15T09:00:00'

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 'b1',
    familyId: 'fam1',
    familyName: 'The Lees',
    nannyId: 'nan1',
    nannyName: 'Ana',
    date: '2026-06-16', // Tuesday, ~27h out → inside 48h window
    startTime: '15:00',
    endTime: '18:00',
    address: '1 Olive St',
    status: 'confirmed',
    recurring: true,
    recurrenceId: 'r1',
    createdAt: null,
    ...overrides,
  }
}

// Tuesday (day 2) 15:00–18:00 fully covers the default booking slot.
const covering: AvailabilityByNanny = { nan1: [{ day: 2, start: '14:00', end: '20:00' }] }
// Same nanny, but availability removed entirely (the conflict case).
const empty: AvailabilityByNanny = { nan1: [] }

describe('findRecurringConflicts (CLAUDE.md §11.4 48h auto-cancel)', () => {
  it('flags a recurring booking within 48h whose nanny dropped the covering availability', () => {
    const result = findRecurringConflicts([booking({})], empty, NOW)
    expect(result.map((b) => b.id)).toEqual(['b1'])
  })

  it('does NOT flag when the nanny still has covering availability', () => {
    expect(findRecurringConflicts([booking({})], covering, NOW)).toEqual([])
  })

  it('does NOT flag a conflict outside the 48h window', () => {
    // 5 days out — a real conflict, but beyond the 48h detection horizon.
    const far = booking({ id: 'b-far', date: '2026-06-20' })
    expect(findRecurringConflicts([far], empty, NOW)).toEqual([])
  })

  it('ignores non-recurring bookings entirely', () => {
    const oneOff = booking({ id: 'b-once', recurring: false })
    expect(findRecurringConflicts([oneOff], empty, NOW)).toEqual([])
  })

  it('ignores bookings already in the past', () => {
    const past = booking({ id: 'b-past', date: '2026-06-14' })
    expect(findRecurringConflicts([past], empty, NOW)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// resolveRecurring — gate on the "Make this recurring" checkbox (CLAUDE.md §11.4)
// ---------------------------------------------------------------------------

describe('resolveRecurring (recurring request gate)', () => {
  const mon: AvailabilityBlock[] = [{ day: 1, start: '15:00', end: '20:00' }]

  it('grants recurring when a named nanny covers the weekday/time and status is confirmed', () => {
    const r = resolveRecurring({
      requested: true,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-15', // Monday
      startTime: '15:00',
      endTime: '18:00',
      status: 'confirmed',
    })
    expect(r.recurring).toBe(true)
    expect(r.reason).toBe(null)
  })

  it('refuses recurring when the slot falls outside the nanny weekly availability', () => {
    const r = resolveRecurring({
      requested: true,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-15', // Monday, but 21:00 is past the 20:00 block end
      startTime: '20:30',
      endTime: '22:00',
      status: 'pending',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe('outside-availability')
  })

  it('refuses recurring on a different weekday than the nanny opened', () => {
    const r = resolveRecurring({
      requested: true,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-16', // Tuesday — nanny only opened Monday
      startTime: '15:00',
      endTime: '18:00',
      status: 'pending',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe('outside-availability')
  })

  it('refuses recurring when no nanny was chosen (no one has agreed to the slot)', () => {
    const r = resolveRecurring({
      requested: true,
      nannyId: null,
      availability: [],
      date: '2026-06-15',
      startTime: '15:00',
      endTime: '18:00',
      status: 'open',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe('no-nanny')
  })

  it('refuses recurring on a same-day booking routed to admin review', () => {
    // Same-day goes to a human; a series must never be spawned off an unreviewed request.
    const r = resolveRecurring({
      requested: true,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-15',
      startTime: '15:00',
      endTime: '18:00',
      status: 'same_day_review',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe('not-confirmed')
  })

  it('refuses recurring when the booking is only pending (nanny has not accepted yet)', () => {
    // Covered by availability but downgraded for a rate mismatch: the nanny never agreed,
    // so the family must not lock a weekly slot on them.
    const r = resolveRecurring({
      requested: true,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-15',
      startTime: '15:00',
      endTime: '18:00',
      status: 'pending',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe('not-confirmed')
  })

  it('returns false with no reason when recurring was never requested', () => {
    const r = resolveRecurring({
      requested: false,
      nannyId: 'nan1',
      availability: mon,
      date: '2026-06-15',
      startTime: '15:00',
      endTime: '18:00',
      status: 'confirmed',
    })
    expect(r.recurring).toBe(false)
    expect(r.reason).toBe(null)
  })
})
