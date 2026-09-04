import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui/Toast'
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

// Dates RELATIVE to the machine clock, not hardcoded — a fixed '2026-09-07' silently drifts under
// 25h (then <0h) as that day approaches and passes, which would flip the routing the confirm tests
// assert. MONDAY is the Monday ~2 weeks out (always comfortably ≥25h and inside the nanny's Monday
// hours → confirmed); TUESDAY is the day after (a Tuesday she never opened → job board).
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nextMondayAtLeast(daysOut: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysOut)
  // Advance to the next Monday (getDay() === 1).
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}
const MONDAY_DATE = nextMondayAtLeast(10)
const MONDAY = iso(MONDAY_DATE)
const TUESDAY = iso(new Date(MONDAY_DATE.getTime() + 86_400_000))

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
      <ToastProvider>
        <FamilyCalendarPage />
      </ToastProvider>
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
    // And it must not have quietly auto-confirmed either — out-of-hours goes to the job board.
    expect(createBooking.mock.calls[0][0]).toMatchObject({ status: 'open' })
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

// The most-used action in the product failed silently. confirm() was try/finally with NO catch
// and no error state anywhere in the component: on rejection the resets never ran, the spinner
// just stopped, and the modal sat there with the notes still in it — indistinguishable from
// "nothing happened". So the parent clicks Confirm again.
//
// This became reachable the moment the past-date guard landed: createBooking now genuinely
// throws, and firestore.rules can deny the write too.
describe('FamilyCalendarPage — a booking that fails says so', () => {
  it('shows an error instead of closing the modal when the booking is rejected', async () => {
    createBooking.mockRejectedValueOnce(new Error('Cannot book 2020-01-01: that date is in the past.'))
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('keeps the modal open so the family does not lose what they typed', async () => {
    createBooking.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    await screen.findByRole('alert')
    // Still on the booking form, not silently dismissed.
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument()
  })

  it('lets them try again — the button is not left spinning', async () => {
    createBooking.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: /confirm booking/i })).not.toBeDisabled()
  })

  it('clears a previous error when the next attempt succeeds', async () => {
    createBooking.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY)
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: /confirm booking/i }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

// F3: confirming a booking used to close the modal and go silent. Now that pending/accept-decline
// is gone, the two real outcomes are: auto-confirmed with the chosen nanny, or posted to the job
// board. The toast must name which one happened.
describe('FamilyCalendarPage — the confirmation toast (F3)', () => {
  beforeEach(() => {
    createBooking.mockClear()
  })

  it('says "all set" when the booking auto-confirms inside the nanny’s hours', async () => {
    const user = userEvent.setup()
    await openBookingModal(user, MONDAY) // inside Priya's Monday hours, ≥25h out → confirmed
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    // Names the nanny and the confirmed outcome, and it's announced via the status region.
    const toast = await screen.findByText(/booked with priya .* all set/i)
    expect(toast.closest('[role="status"]')).toBeTruthy()
  })

  it('says it was POSTED to the board when the slot is outside the nanny’s hours', async () => {
    const user = userEvent.setup()
    await openBookingModal(user, TUESDAY) // Priya opened Monday only → out-of-hours → open/board
    await user.selectOptions(screen.getByLabelText('Nanny'), 'n1')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    // Out-of-hours must NOT read as confirmed — it goes to the job board, not to Priya directly.
    expect(await screen.findByText(/posted to our nannies/i)).toBeInTheDocument()
    expect(screen.queryByText(/all set/i)).toBeNull()
  })
})
