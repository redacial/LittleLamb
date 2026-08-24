// Past days were fully clickable: `today` drove only the styling pill, and every cell was an
// unconditional <button>. That is how a booking for a date that had already passed got created
// — and, being inside the nanny's hours, auto-confirmed and emailed to both parties.
//
// The grid guard is the courtesy (don't offer what we'll reject); createBooking and
// firestore.rules are the correctness. This file covers the courtesy.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthGrid } from './MonthGrid'

const TODAY = '2026-08-24' // a Monday

function grid(onPickDay = vi.fn()) {
  render(
    <MonthGrid year={2026} month={7} today={TODAY} bookings={[]} onPickDay={onPickDay} />,
  )
  return onPickDay
}

/** The day cell for a given day-of-month — the button whose own text is that number. */
function dayCell(day: number): HTMLElement {
  const match = screen
    .getAllByRole('button')
    .find((b) => b.querySelector('span')?.textContent === String(day))
  if (!match) throw new Error(`no day cell for ${day}`)
  return match
}

describe('MonthGrid — past days cannot start a booking', () => {
  it('disables a day before today', () => {
    grid()
    expect(dayCell(23)).toBeDisabled()
  })

  it('does NOT call onPickDay when a past day is clicked', async () => {
    const onPickDay = grid()
    await userEvent.click(dayCell(23))
    expect(onPickDay).not.toHaveBeenCalled()
  })

  it('leaves today itself bookable — same-day is supported, just routed differently', async () => {
    const onPickDay = grid()
    expect(dayCell(24)).not.toBeDisabled()
    await userEvent.click(dayCell(24))
    expect(onPickDay).toHaveBeenCalledWith(TODAY)
  })

  it('leaves future days bookable', async () => {
    const onPickDay = grid()
    expect(dayCell(25)).not.toBeDisabled()
    await userEvent.click(dayCell(25))
    expect(onPickDay).toHaveBeenCalledWith('2026-08-25')
  })

  it('marks past days so they read as unavailable, not merely inert', () => {
    grid()
    // A disabled control with no visual difference is a worse experience than none.
    expect(dayCell(23).className).not.toBe(dayCell(25).className)
  })
})
