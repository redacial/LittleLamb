// WeekGrid is the Google-Calendar-style week view: a time axis × 7 day columns where a family
// drags down a day column to define a booking slot. It is a PRESENTATION component — it never
// writes a booking; it hands the snapped (date, start, end) up via onCreateSlot, and the page
// feeds that into the unchanged createBooking path.
//
// These specs pin the contract the page relies on:
//  - a pointer drag down a column fires onCreateSlot with 15-min-snapped times (min 1h),
//  - a drag on a PAST day never fires (same courtesy as MonthGrid's disabled past days),
//  - the keyboard-accessible per-day "new booking" button fires onCreateSlot (drag is
//    pointer-only, so this is the a11y equivalent — WCAG 2.1.1),
//  - clicking a rendered booking block fires onPickBooking.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekGrid } from './WeekGrid'
import type { Booking } from '../../types'

// A fixed Sunday so weekday math is deterministic. 2026-08-23 is a Sunday; the week runs
// 2026-08-23 (Sun) … 2026-08-29 (Sat). TODAY is the Wednesday of that week, so Sun–Tue are past.
const WEEK_START = '2026-08-23'
const TODAY = '2026-08-26' // Wednesday

function booking(over: Partial<Booking> & Pick<Booking, 'id' | 'date' | 'status'>): Booking {
  return {
    familyId: 'f1',
    familyName: 'The Smiths',
    nannyId: 'n1',
    nannyName: 'Ada',
    startTime: '15:00',
    endTime: '18:00',
    address: '1 Main St',
    recurring: false,
    createdAt: null,
    ...over,
  } as Booking
}

/** A slot cell for a given ISO date and minute-of-day, addressable by data attributes. */
function slot(date: string, minutes: number): HTMLElement {
  const el = document.querySelector(`[data-slot-date="${date}"][data-slot-min="${minutes}"]`)
  if (!el) throw new Error(`no slot cell for ${date} @ ${minutes}`)
  return el as HTMLElement
}

describe('WeekGrid — drag to create a slot', () => {
  it('fires onCreateSlot with 15-min-snapped times when dragging down a future day column', () => {
    const onCreateSlot = vi.fn()
    render(
      <WeekGrid weekStart={WEEK_START} today={TODAY} bookings={[]} onCreateSlot={onCreateSlot} />,
    )
    const FRIDAY = '2026-08-28'
    // Drag from 15:00 (900) to 17:00 (1020).
    fireEvent.pointerDown(slot(FRIDAY, 900))
    fireEvent.pointerEnter(slot(FRIDAY, 1020))
    fireEvent.pointerUp(slot(FRIDAY, 1020))

    expect(onCreateSlot).toHaveBeenCalledTimes(1)
    expect(onCreateSlot).toHaveBeenCalledWith(FRIDAY, '15:00', '17:00')
  })

  it('enforces the 1-hour minimum on a short drag', () => {
    const onCreateSlot = vi.fn()
    render(
      <WeekGrid weekStart={WEEK_START} today={TODAY} bookings={[]} onCreateSlot={onCreateSlot} />,
    )
    const FRIDAY = '2026-08-28'
    // A single-slot drag (15 min) must be extended to a full hour.
    fireEvent.pointerDown(slot(FRIDAY, 900))
    fireEvent.pointerUp(slot(FRIDAY, 900))

    expect(onCreateSlot).toHaveBeenCalledWith(FRIDAY, '15:00', '16:00')
  })

  it('does NOT fire onCreateSlot for a past day', () => {
    const onCreateSlot = vi.fn()
    render(
      <WeekGrid weekStart={WEEK_START} today={TODAY} bookings={[]} onCreateSlot={onCreateSlot} />,
    )
    const MONDAY = '2026-08-24' // before TODAY (Wed)
    fireEvent.pointerDown(slot(MONDAY, 900))
    fireEvent.pointerUp(slot(MONDAY, 900))

    expect(onCreateSlot).not.toHaveBeenCalled()
  })
})

describe('WeekGrid — keyboard-accessible slot creation', () => {
  it('each future day exposes a "new booking" button that fires onCreateSlot', async () => {
    const onCreateSlot = vi.fn()
    const user = userEvent.setup()
    render(
      <WeekGrid weekStart={WEEK_START} today={TODAY} bookings={[]} onCreateSlot={onCreateSlot} />,
    )
    const FRIDAY = '2026-08-28'
    // Addressed by an accessible name mentioning the day, located by data attribute on wrapper.
    const btn = document.querySelector(`[data-new-booking="${FRIDAY}"]`) as HTMLElement
    expect(btn).toBeTruthy()
    await user.click(btn)
    expect(onCreateSlot).toHaveBeenCalledTimes(1)
    // Fires with the page's default window; start < end and both HH:MM.
    const [date, start, end] = onCreateSlot.mock.calls[0]
    expect(date).toBe(FRIDAY)
    expect(start).toMatch(/^\d{2}:\d{2}$/)
    expect(end).toMatch(/^\d{2}:\d{2}$/)
    expect(start < end).toBe(true)
  })

  it('does not render a "new booking" button on a past day', () => {
    render(<WeekGrid weekStart={WEEK_START} today={TODAY} bookings={[]} onCreateSlot={vi.fn()} />)
    const MONDAY = '2026-08-24'
    expect(document.querySelector(`[data-new-booking="${MONDAY}"]`)).toBeNull()
  })
})

describe('WeekGrid — existing bookings', () => {
  it('renders a booking block and fires onPickBooking when activated', async () => {
    const onPickBooking = vi.fn()
    const user = userEvent.setup()
    render(
      <WeekGrid
        weekStart={WEEK_START}
        today={TODAY}
        bookings={[booking({ id: 'b1', date: '2026-08-28', status: 'confirmed', nannyName: 'Ada' })]}
        onPickBooking={onPickBooking}
      />,
    )
    const block = screen.getByRole('button', { name: /ada/i })
    await user.click(block)
    expect(onPickBooking).toHaveBeenCalledTimes(1)
    expect(onPickBooking.mock.calls[0][0]).toMatchObject({ id: 'b1' })
  })

  it('names the booking status without relying on colour', () => {
    render(
      <WeekGrid
        weekStart={WEEK_START}
        today={TODAY}
        bookings={[booking({ id: 'b1', date: '2026-08-28', status: 'confirmed', nannyName: 'Ada' })]}
      />,
    )
    const block = screen.getByRole('button', { name: /ada/i })
    const text = `${block.textContent ?? ''} ${block.getAttribute('aria-label') ?? ''} ${block.getAttribute('title') ?? ''}`
    expect(text).toMatch(/confirmed/i)
  })

  it('on the nanny side, labels a booking with the family name', () => {
    render(
      <WeekGrid
        weekStart={WEEK_START}
        today={TODAY}
        labelWith="family"
        bookings={[booking({ id: 'b1', date: '2026-08-28', status: 'confirmed', familyName: 'The Smiths', nannyName: 'Ada' })]}
      />,
    )
    const block = screen.getByRole('button', { name: /smiths/i })
    expect(within(block).getByText(/smiths/i)).toBeTruthy()
  })
})
