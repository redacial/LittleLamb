import { describe, it, expect } from 'vitest'
import { findRecurringConflicts, type AvailabilityByNanny } from './recurring'
import type { Booking } from '../types'

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
