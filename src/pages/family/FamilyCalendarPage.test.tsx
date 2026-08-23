import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FamilyCalendarPage } from './FamilyCalendarPage'

// Recurring bookings were unreachable dead code: `recurring: true` appeared NOWHERE in src/,
// because neither createBooking call site ever passed the flag and no UI could set it. The
// hourly 48h auto-cancel job, the recurring_booking_auto_cancelled template and a composite
// index all existed to serve a value that could never be written.
//
// These specs pin the family-facing control that finally sets it, and — more importantly —
// the two ways it must REFUSE to. A recurring booking is a standing weekly claim on a nanny,
// so it must never be created off a slot the nanny never opened, or off a request the nanny
// has not yet accepted.

// Typed with the one argument the page actually passes, so `calls[0][0]` is a real object
// rather than `never` — the assertions below inspect the created booking's fields.
const createBooking = vi.fn((_input: Record<string, unknown>) => Promise.resolve('new-booking-id'))

// Monday 15:00–20:00 only. 2026-09-07 is a Monday; 2026-09-08 is a Tuesday.
const MONDAY = '2026-09-07'
const TUESDAY = '2026-09-08'

const nanny = {
  uid: 'n1',
  fullName: 'Priya',
  availability: [{ day: 1, start: '15:00', end: '20:00' }],
}

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings: [], loading: false }),
  createBooking: (input: Record<string, unknown>) => createBooking(input),
}))

vi.mock('../../hooks/useNannies', () => ({
  useNannyDirectory: () => ({ nannies: [nanny], loading: false }),
}))

vi.mock('../../hooks/useProfile', () => ({
  useFamilyProfile: () => ({
    profile: { homeAddress: '5 Cliff Dr, Santa Barbara, CA' },
    loading: false,
  }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { fullName: 'The Ortegas' },
    user: { uid: 'f1' },
  }),
}))

/**
 * Open the booking modal on a given day. MonthGrid renders each day as a button labelled
 * with the day-of-month, so we navigate to September 2026 and click the right number.
 */
async function openBookingModal(user: ReturnType<typeof userEvent.setup>, isoDate: string) {
  render(
    <MemoryRouter>
      <FamilyCalendarPage />
    </MemoryRouter>,
  )

  const target = new Date(`${isoDate}T00:00:00`)
  // Step the month header forward from "today" until we land on the target month.
  for (let i = 0; i < 60; i++) {
    const header = screen.getByText(/^[A-Z][a-z]+ \d{4}$/)
    const shown = new Date(`${header.textContent} 1`)
    if (
      shown.getFullYear() === target.getFullYear() &&
      shown.getMonth() === target.getMonth()
    ) {
      break
    }
    await user.click(
      screen.getByRole('button', {
        name: shown < target ? /next month/i : /previous month/i,
      }),
    )
  }

  const dayNumber = String(target.getDate())
  const dayCells = screen
    .getAllByRole('button')
    .filter((b) => b.textContent?.trim().startsWith(dayNumber))
  await user.click(dayCells[0])
}

/** The recurring checkbox, by its visible label. */
function recurringBox() {
  return screen.getByRole('checkbox', { name: /make this recurring/i })
}

describe('FamilyCalendarPage — "Make this recurring"', () => {
  beforeEach(() => {
    createBooking.mockClear()
    vi.setSystemTime(new Date('2026-08-16T09:00:00'))
  })

  it('creates the booking with recurring:true when the slot is inside the nanny’s weekly hours', async () => {
    // THE regression this whole feature exists for: before the checkbox, no code path in
    // src/ could ever produce recurring:true, so every downstream recurring feature was dead.
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)

    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(recurringBox())
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(createBooking).toHaveBeenCalledTimes(1)
    expect(createBooking.mock.calls[0][0]).toMatchObject({
      nannyId: 'n1',
      date: MONDAY,
      status: 'confirmed',
      recurring: true,
    })
  })

  it('does NOT set recurring when the day falls outside the nanny’s weekly availability', async () => {
    // Tuesday: the nanny opened Monday only. Silently creating a weekly Tuesday claim would
    // commit her to hours she never agreed to.
    const user = userEvent.setup()
    await openBookingModal(user, TUESDAY)

    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(recurringBox())

    // The family is told, in place, what will happen instead — not silently ignored.
    expect(screen.getByText(/outside that nanny.s weekly hours/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(createBooking.mock.calls[0][0]).toMatchObject({
      date: TUESDAY,
      recurring: false,
    })
    // And it must not have quietly auto-confirmed either — out-of-hours stays a request.
    expect(createBooking.mock.calls[0][0]).toMatchObject({ status: 'pending' })
  })

  it('does NOT set recurring when no nanny was chosen', async () => {
    // An unmatched booking has nobody to recur WITH.
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)

    await user.click(recurringBox())
    expect(screen.getByText(/pick a specific nanny/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm booking/i }))
    expect(createBooking.mock.calls[0][0]).toMatchObject({ recurring: false })
  })

  it('leaves recurring false when the box is never ticked', async () => {
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)

    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(createBooking.mock.calls[0][0]).toMatchObject({ recurring: false })
  })
})
