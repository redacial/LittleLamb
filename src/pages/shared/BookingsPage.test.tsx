import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BookingsPage } from './BookingsPage'

// BUG 2, fourth and last call site. BookingRow declared its onAction prop as
// (id, s) => void, which erased meta/actor at the TYPE level — so the three buttons on this
// shared page (nanny Accept, nanny Decline, family Cancel) each wrote the status and emailed
// nobody, and no amount of adding arguments at the call sites would compile until the prop
// type was widened to match setStatus.
//
// Asserting on the ARGUMENTS setStatus receives (not on notify) is deliberate: the hook's own
// spec covers which event fires, and this spec covers the thing the page is responsible for —
// handing the hook enough to address the mail, and saying who acted.

const setStatus = vi.fn(() => Promise.resolve())

const pendingBooking = {
  id: 'b1',
  status: 'pending',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings: [pendingBooking], loading: false }),
  useBookingActions: () => ({ setStatus, assignNanny: vi.fn() }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { fullName: 'Priya Raman' },
    user: { uid: 'n1' },
  }),
}))

/** The booking fields every booking email needs to address and describe itself. */
const addressable = {
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

function renderPage(role: 'family' | 'nanny') {
  return render(
    <MemoryRouter>
      <BookingsPage role={role} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  setStatus.mockClear()
})

describe('BookingsPage — accept/decline/cancel must be able to send mail', () => {
  it('nanny ACCEPT passes the booking meta and marks the nanny as the actor', async () => {
    renderPage('nanny')

    await userEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'confirmed',
      expect.objectContaining(addressable),
      'nanny',
    )
  })

  it('nanny DECLINE passes the booking meta and marks the nanny as the actor', async () => {
    // The actor argument is what routes this to booking_request_declined → FAMILY. Defaulting
    // to 'family' here would email the nanny about her own decline and leave the family — the
    // side that has to go rebook — unaware, which is exactly the bug 950012d fixed elsewhere.
    renderPage('nanny')

    await userEvent.click(screen.getByRole('button', { name: /decline/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'cancelled',
      expect.objectContaining(addressable),
      'nanny',
    )
  })

  it('family CANCEL passes the booking meta and marks the family as the actor', async () => {
    renderPage('family')

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'cancelled',
      expect.objectContaining(addressable),
      'family',
    )
  })
})
