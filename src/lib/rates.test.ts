import { describe, it, expect } from 'vitest'
import {
  rangesOverlap,
  overlapWindow,
  formatRate,
  parseRateDollars,
  isValidRange,
  resolveBookingStatus,
  RATE_MAX_CENTS,
} from './rates'

const r = (min: number, max: number) => ({ minCents: min, maxCents: max })

describe('isValidRange', () => {
  it('accepts a well-formed range', () => {
    expect(isValidRange(r(2000, 3000))).toBe(true)
  })

  it('rejects inverted, negative, non-integer, over-cap, and missing ranges', () => {
    expect(isValidRange(r(3000, 2000))).toBe(false)
    expect(isValidRange(r(-100, 3000))).toBe(false)
    expect(isValidRange(r(20.5, 3000))).toBe(false)
    expect(isValidRange(r(2000, RATE_MAX_CENTS + 1))).toBe(false)
    expect(isValidRange(undefined)).toBe(false)
    expect(isValidRange(null)).toBe(false)
  })
})

describe('rangesOverlap', () => {
  it('overlapping ranges match', () => {
    expect(rangesOverlap(r(2000, 3000), r(2500, 4000))).toBe(true)
  })

  it('a range fully containing the other matches', () => {
    expect(rangesOverlap(r(1500, 5000), r(2500, 3000))).toBe(true)
  })

  it('disjoint-above does not match', () => {
    // Family pays $15-20, nanny wants $30-40.
    expect(rangesOverlap(r(1500, 2000), r(3000, 4000))).toBe(false)
  })

  it('disjoint-below does not match', () => {
    expect(rangesOverlap(r(6000, 7000), r(3000, 4000))).toBe(false)
  })

  it('touching bounds DO match (inclusive)', () => {
    // $25 is acceptable to both sides.
    expect(rangesOverlap(r(2000, 2500), r(2500, 3000))).toBe(true)
  })

  it('one cent apart does not match', () => {
    expect(rangesOverlap(r(2000, 2500), r(2501, 3000))).toBe(false)
  })

  it('is permissive when either side has no range', () => {
    // Accounts predating the feature must not vanish from the directory.
    expect(rangesOverlap(undefined, r(3000, 4000))).toBe(true)
    expect(rangesOverlap(r(3000, 4000), undefined)).toBe(true)
    expect(rangesOverlap(undefined, undefined)).toBe(true)
  })

  it('is permissive when a stored range is malformed', () => {
    expect(rangesOverlap(r(3000, 2000), r(100, 200))).toBe(true)
  })
})

describe('overlapWindow', () => {
  it('returns the intersection', () => {
    expect(overlapWindow(r(2000, 3000), r(2500, 4000))).toEqual(r(2500, 3000))
  })

  it('returns a single point for touching bounds', () => {
    expect(overlapWindow(r(2000, 2500), r(2500, 3000))).toEqual(r(2500, 2500))
  })

  it('returns null for disjoint ranges', () => {
    expect(overlapWindow(r(1500, 2000), r(3000, 4000))).toBeNull()
  })

  it('returns null when either side is missing — nothing was agreed', () => {
    // Note this differs from rangesOverlap: absence is a permissive MATCH but never
    // an agreed window, so the booking snapshot stays honest about what is known.
    expect(overlapWindow(undefined, r(3000, 4000))).toBeNull()
  })
})

describe('formatRate', () => {
  it('formats whole-dollar ranges', () => {
    expect(formatRate(r(2500, 3500))).toBe('$25–$35/hr')
  })

  it('formats cents when not whole dollars', () => {
    expect(formatRate(r(2750, 3000))).toBe('$27.50–$30/hr')
  })

  it('collapses an equal min/max to a single rate', () => {
    expect(formatRate(r(3000, 3000))).toBe('$30/hr')
  })

  it('says so when unset or malformed', () => {
    expect(formatRate(undefined)).toBe('Rate not set')
    expect(formatRate(r(3000, 2000))).toBe('Rate not set')
  })
})

describe('parseRateDollars', () => {
  it('parses plain, $-prefixed, decimal, and padded input', () => {
    expect(parseRateDollars('25')).toBe(2500)
    expect(parseRateDollars('$30')).toBe(3000)
    expect(parseRateDollars('27.50')).toBe(2750)
    expect(parseRateDollars('  22  ')).toBe(2200)
  })

  it('rounds to the nearest cent', () => {
    expect(parseRateDollars('25.555')).toBe(2556)
  })

  it('returns null for empty, non-numeric, negative, and over-cap input', () => {
    expect(parseRateDollars('')).toBeNull()
    expect(parseRateDollars('abc')).toBeNull()
    expect(parseRateDollars('-5')).toBeNull()
    expect(parseRateDollars('600')).toBeNull() // above the $500/hr cap
  })

  it('distinguishes zero from invalid', () => {
    expect(parseRateDollars('0')).toBe(0)
  })
})

describe('resolveBookingStatus', () => {
  const base = { date: '2026-08-20', today: '2026-08-10', withinHours: true, rateOverlaps: true }

  it('confirms when in-hours and the rates overlap', () => {
    expect(resolveBookingStatus(base)).toBe('confirmed')
  })

  it('downgrades to pending on a rate mismatch (soft, not blocked)', () => {
    expect(resolveBookingStatus({ ...base, rateOverlaps: false })).toBe('pending')
  })

  it('still downgrades to pending when outside hours', () => {
    expect(resolveBookingStatus({ ...base, withinHours: false })).toBe('pending')
  })

  it('routes same-day to admin regardless of hours or rate', () => {
    const sameDay = { ...base, date: '2026-08-10' }
    expect(resolveBookingStatus(sameDay)).toBe('same_day_review')
    expect(resolveBookingStatus({ ...sameDay, withinHours: false, rateOverlaps: false })).toBe(
      'same_day_review',
    )
  })
})
