import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NannyDashboard } from './NannyDashboard'

// BUG 2 at the nanny call sites. setStatus's email branch is guarded on receiving booking
// `meta`; this dashboard called setStatus(id, status) with no meta at all, so Accept and
// Decline both wrote the status and emailed nobody. The status change was visible in the UI,
// which is exactly why it survived — the only missing artefact was an email no one was
// watching for.
//
// Asserting on the ARGUMENTS setStatus receives (not on notify) is deliberate: the hook's own
// spec covers which event fires, and this spec covers the thing the page is responsible for —
// handing the hook enough to address the mail, and saying who acted.

const setStatus = vi.fn(() => Promise.resolve())
const assignNanny = vi.fn(() => Promise.resolve())

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
  useOpenBookings: () => [],
  useBookingActions: () => ({ setStatus, assignNanny }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { fullName: 'Priya Raman' },
    user: { uid: 'n1' },
  }),
}))

function renderDash() {
  return render(
    <MemoryRouter>
      <NannyDashboard />
    </MemoryRouter>,
  )
}

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

beforeEach(() => {
  setStatus.mockClear()
  assignNanny.mockClear()
})

describe('NannyDashboard — accept/decline must be able to send mail', () => {
  it('ACCEPT passes the booking meta and marks the nanny as the actor', async () => {
    renderDash()

    await userEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'confirmed',
      expect.objectContaining(addressable),
      'nanny',
    )
  })

  it('DECLINE passes the booking meta and marks the nanny as the actor', async () => {
    // The actor argument is what routes this to booking_request_declined → family rather
    // than the family-cancel event that used to fire back at the nanny (BUG 3).
    renderDash()

    await userEvent.click(screen.getByRole('button', { name: /decline/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'cancelled',
      expect.objectContaining(addressable),
      'nanny',
    )
  })
})
