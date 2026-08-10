import { describe, it, expect } from 'vitest'
import { checkQuota, dayBucket, type QuotaState } from './quota'

const at = (iso: string) => new Date(iso)

describe('dayBucket', () => {
  it('buckets by UTC date', () => {
    expect(dayBucket(at('2026-08-11T00:00:00Z'))).toBe('2026-08-11')
    expect(dayBucket(at('2026-08-11T23:59:59Z'))).toBe('2026-08-11')
  })

  it('rolls over at UTC midnight, not local midnight', () => {
    expect(dayBucket(at('2026-08-12T00:00:00Z'))).toBe('2026-08-12')
  })
})

describe('checkQuota', () => {
  const now = at('2026-08-11T12:00:00Z')

  it('allows the first send and starts the counter', () => {
    expect(checkQuota(null, now, 100)).toEqual({
      allowed: true,
      next: { day: '2026-08-11', count: 1 },
    })
  })

  it('increments within the same day', () => {
    const current: QuotaState = { day: '2026-08-11', count: 4 }
    expect(checkQuota(current, now, 100)).toEqual({
      allowed: true,
      next: { day: '2026-08-11', count: 5 },
    })
  })

  it('allows exactly up to the cap', () => {
    const current: QuotaState = { day: '2026-08-11', count: 99 }
    const d = checkQuota(current, now, 100)
    expect(d.allowed).toBe(true)
    expect(d.next.count).toBe(100)
  })

  it('blocks once the cap is reached', () => {
    const current: QuotaState = { day: '2026-08-11', count: 100 }
    expect(checkQuota(current, now, 100).allowed).toBe(false)
  })

  it('does NOT increment while blocked, so the counter cannot run away', () => {
    const current: QuotaState = { day: '2026-08-11', count: 100 }
    expect(checkQuota(current, now, 100).next.count).toBe(100)
    // A sustained flood keeps hitting the same ceiling rather than inflating the number.
    expect(checkQuota({ day: '2026-08-11', count: 5000 }, now, 100).next.count).toBe(5000)
  })

  it('resets on a new day rather than carrying the count over', () => {
    const yesterday: QuotaState = { day: '2026-08-10', count: 100 }
    expect(checkQuota(yesterday, now, 100)).toEqual({
      allowed: true,
      next: { day: '2026-08-11', count: 1 },
    })
  })

  it('a stale bucket from long ago also resets', () => {
    const old: QuotaState = { day: '2025-01-01', count: 99999 }
    const d = checkQuota(old, now, 100)
    expect(d.allowed).toBe(true)
    expect(d.next).toEqual({ day: '2026-08-11', count: 1 })
  })
})
