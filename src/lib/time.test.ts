import { describe, it, expect } from 'vitest'
import {
  hhmmToMinutes,
  minutesToHHMM,
  snapTo15,
  SLOT_MINUTES,
  MIN_BOOKING_MINUTES,
  resolveSlot,
} from './time'

describe('hhmmToMinutes / minutesToHHMM', () => {
  it('converts HH:MM to minutes past midnight', () => {
    expect(hhmmToMinutes('00:00')).toBe(0)
    expect(hhmmToMinutes('15:00')).toBe(900)
    expect(hhmmToMinutes('08:45')).toBe(525)
    expect(hhmmToMinutes('23:59')).toBe(1439)
  })

  it('round-trips through minutesToHHMM, zero-padded', () => {
    expect(minutesToHHMM(0)).toBe('00:00')
    expect(minutesToHHMM(900)).toBe('15:00')
    expect(minutesToHHMM(525)).toBe('08:45')
    expect(minutesToHHMM(hhmmToMinutes('09:05'))).toBe('09:05')
  })
})

describe('snapTo15', () => {
  it('rounds minutes to the nearest 15-minute slot', () => {
    expect(snapTo15(0)).toBe(0)
    expect(snapTo15(7)).toBe(0) // nearest is 0
    expect(snapTo15(8)).toBe(15) // nearest is 15
    expect(snapTo15(22)).toBe(15)
    expect(snapTo15(23)).toBe(30)
    expect(snapTo15(900)).toBe(900)
    expect(snapTo15(907)).toBe(900)
    expect(snapTo15(908)).toBe(915)
  })

  it('uses a 15-minute slot', () => {
    expect(SLOT_MINUTES).toBe(15)
  })
})

describe('resolveSlot', () => {
  it('snaps both ends to 15 minutes and returns HH:MM strings', () => {
    // 15:07 -> 15:00, 16:23 -> 16:30
    const slot = resolveSlot(hhmmToMinutes('15:07'), hhmmToMinutes('16:23'))
    expect(slot).toEqual({ startTime: '15:00', endTime: '16:30' })
  })

  it('enforces a minimum 1-hour duration by extending the end', () => {
    expect(MIN_BOOKING_MINUTES).toBe(60)
    // A 15-minute drag becomes a 1-hour slot anchored at the start.
    const slot = resolveSlot(hhmmToMinutes('15:00'), hhmmToMinutes('15:15'))
    expect(slot).toEqual({ startTime: '15:00', endTime: '16:00' })
  })

  it('orders the ends regardless of drag direction', () => {
    // Dragging upward (anchor below hover) still yields start < end.
    const slot = resolveSlot(hhmmToMinutes('18:00'), hhmmToMinutes('15:00'))
    expect(slot.startTime).toBe('15:00')
    expect(slot.endTime).toBe('18:00')
  })

  it('keeps a slot that already meets the minimum unchanged after snapping', () => {
    const slot = resolveSlot(hhmmToMinutes('09:00'), hhmmToMinutes('12:00'))
    expect(slot).toEqual({ startTime: '09:00', endTime: '12:00' })
  })
})
