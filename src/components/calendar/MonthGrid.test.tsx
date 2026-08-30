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
import type { Booking } from '../../types'

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

// Booking status was conveyed by BACKGROUND COLOUR ALONE — bg-ll-sage-light (confirmed) vs
// bg-ll-terra-soft (pending) — and the legend was colour-only dots. A red-green colourblind
// parent could not tell a confirmed sitter from an unconfirmed request, which on this platform
// is the difference between "childcare is handled" and "nobody is coming". DESIGN_SYSTEM.md
// mandates WCAG AA; SC 1.4.1 Use of Color forbids colour as the only carrier of meaning.
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

/**
 * The rendered label element for a booking, located the way a user finds it: the clickable
 * label inside the day cell for that date. Deliberately NOT keyed on a test-only data
 * attribute — the assertions below must fail because the STATUS is illegible without colour,
 * not because a selector hook is missing.
 */
function label(date: string): HTMLElement {
  const day = Number(date.slice(-2))
  const cell = dayCell(day)
  const el = cell.querySelector('[role="button"]')
  if (!el) throw new Error(`no booking label rendered on ${date}`)
  return el as HTMLElement
}

/** Strip every class so only non-colour signal (text/glyph/aria) remains. */
function colourlessText(el: HTMLElement): string {
  return `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''}`
}

describe('MonthGrid — booking status is distinguishable without colour', () => {
  const bookings = [
    booking({ id: 'b-conf', date: '2026-08-25', status: 'confirmed', nannyName: 'Ada' }),
    booking({ id: 'b-pend', date: '2026-08-26', status: 'pending', nannyName: 'Ada' }),
  ]

  function renderGrid() {
    render(<MonthGrid year={2026} month={7} today={TODAY} bookings={bookings} />)
  }

  it('renders a distinct non-colour signal for confirmed vs pending', () => {
    renderGrid()
    const confirmed = colourlessText(label('2026-08-25'))
    const pending = colourlessText(label('2026-08-26'))
    // With colour removed the two must still read differently.
    expect(confirmed.trim()).not.toBe(pending.trim())
  })

  it('names the confirmed status in text or accessible name', () => {
    renderGrid()
    expect(colourlessText(label('2026-08-25'))).toMatch(/confirmed/i)
  })

  it('names the pending status in text or accessible name', () => {
    renderGrid()
    expect(colourlessText(label('2026-08-26'))).toMatch(/pending/i)
  })

  it('carries a visible glyph, not only an accessible name, so sighted colourblind users see it', () => {
    renderGrid()
    // The visible text of the two labels must differ — an aria-label alone does nothing for a
    // colourblind user who is not running a screen reader.
    const confirmedText = label('2026-08-25').textContent ?? ''
    const pendingText = label('2026-08-26').textContent ?? ''
    expect(confirmedText).not.toBe(pendingText)
  })

  it('legend distinguishes entries by more than a coloured dot', () => {
    renderGrid()
    // Each legend swatch must pair its colour with a shape/glyph difference, so the legend
    // itself is not colour-only either.
    // Find the legend by its visible wording, as a user would.
    const confirmedEntry = screen.getByText(/confirmed/i, { selector: 'span' })
    const legend = confirmedEntry.closest('div')
    expect(legend).toBeTruthy()
    // Each legend entry pairs its colour with a distinct glyph, so the legend is not
    // colour-only either. Compare the glyph characters across entries.
    const entries = Array.from(legend!.querySelectorAll('span.inline-flex'))
    expect(entries.length).toBeGreaterThanOrEqual(2)
    const glyphs = entries.map((e) => (e.querySelector('[aria-hidden]')?.textContent ?? '').trim())
    expect(new Set(glyphs).size).toBeGreaterThan(1)
  })
})
