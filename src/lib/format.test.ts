import { describe, it, expect } from 'vitest'
import { ageFromBirthday, formatAge } from './format'

// Kids are stored by BIRTHDAY now (partner meeting 2026-09), and their age is computed live in
// years + months. The boundaries are the whole point: "3 today" must not read as "2 yrs 11 mos",
// and a baby a few weeks old must read in months, not "0".
describe('ageFromBirthday', () => {
  const now = new Date('2026-09-04T12:00:00')

  it('is 0y 0m for a newborn born today', () => {
    expect(ageFromBirthday('2026-09-04', now)).toEqual({ years: 0, months: 0 })
  })

  it('counts whole months for an infant', () => {
    // Born 5 months + a bit ago.
    expect(ageFromBirthday('2026-04-04', now)).toEqual({ years: 0, months: 5 })
  })

  it('rolls to exactly N years on the birthday', () => {
    expect(ageFromBirthday('2023-09-04', now)).toEqual({ years: 3, months: 0 })
  })

  it('does NOT round up the day before a birthday', () => {
    // Turns 3 tomorrow → still 2 yrs 11 mos today.
    expect(ageFromBirthday('2023-09-05', now)).toEqual({ years: 2, months: 11 })
  })

  it('reports years and the trailing months together', () => {
    // 4 years and 2 months.
    expect(ageFromBirthday('2022-07-04', now)).toEqual({ years: 4, months: 2 })
  })

  it('handles a birth day-of-month later than the current month allows', () => {
    // Born Jan 31; on a March 4 "now" it's 1 month + a few days past Jan 31 → 1 month, not 2.
    expect(ageFromBirthday('2026-01-31', new Date('2026-03-04T12:00:00'))).toEqual({
      years: 0,
      months: 1,
    })
  })

  it('returns null for an empty or unparseable birthday', () => {
    expect(ageFromBirthday('', now)).toBeNull()
    expect(ageFromBirthday('not-a-date', now)).toBeNull()
  })
})

describe('formatAge', () => {
  const now = new Date('2026-09-04T12:00:00')

  it('shows months only under a year', () => {
    expect(formatAge('2026-04-04', now)).toBe('5 mos')
  })

  it('shows a newborn in months as "0 mos" so it never reads as blank', () => {
    expect(formatAge('2026-09-04', now)).toBe('0 mos')
  })

  it('shows whole years with no trailing "0 mos"', () => {
    expect(formatAge('2023-09-04', now)).toBe('3 yrs')
  })

  it('shows years and months together', () => {
    expect(formatAge('2022-07-04', now)).toBe('4 yrs 2 mos')
  })

  it('uses the singular for exactly one year / one month', () => {
    expect(formatAge('2025-08-04', now)).toBe('1 yr 1 mo')
  })

  it('is empty for a missing birthday', () => {
    expect(formatAge('', now)).toBe('')
  })
})
