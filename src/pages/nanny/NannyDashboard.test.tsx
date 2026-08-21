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

/**
 * An open job-board post. Same-day bookings are routed here too (D66) — the board is
 * `status in ['open','unmatched']`, so this fixture stands in for both.
 */
const openBooking = {
  id: 'b2',
  status: 'open',
  familyId: 'f2',
  familyName: 'The Hartleys',
  nannyId: null,
  nannyName: null,
  date: '2026-09-06',
  startTime: '09:00',
  endTime: '13:00',
  address: '12 Olive St, Santa Barbara, CA',
}

let openBookings: unknown[] = []

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings: [pendingBooking], loading: false }),
  useOpenBookings: () => openBookings,
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
  openBookings = []
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

describe('NannyDashboard — claiming an open post must be able to send mail', () => {
  // BUG 5: the fifth dead notification call site. assignNanny's email branch is guarded on
  // receiving booking `meta` (`if (!meta) return`), and this page called
  // assignNanny(b.id, uid, fullName) with no meta — so claiming an open post flipped the
  // booking to `confirmed` in Firestore and the family got NO email and NO calendar invite.
  //
  // This is the worst of the five: every other path emails someone who already knows a nanny
  // is coming. Here the family posted a request with no nanny attached, so this email is the
  // ONLY thing that tells them anyone is showing up. `open_booking_picked_up` had a full
  // template and passing template tests, and was still 100% dead in production.
  //
  // It survived because this file mocked assignNanny and never asserted on it — the same hole
  // asserted shut below.

  /** The booking fields open_booking_picked_up needs to address and describe itself. */
  const openAddressable = {
    familyId: 'f2',
    familyName: 'The Hartleys',
    date: '2026-09-06',
    startTime: '09:00',
    endTime: '13:00',
    address: '12 Olive St, Santa Barbara, CA',
  }

  it('ACCEPT passes the booking meta so the family can be told a nanny is coming', async () => {
    openBookings = [openBooking]
    renderDash()

    await userEvent.click(screen.getByRole('button', { name: /accept this booking/i }))

    expect(assignNanny).toHaveBeenCalledWith(
      'b2',
      'n1',
      'Priya Raman',
      expect.objectContaining(openAddressable),
    )
  })

  it('surfaces an open post on the job board with its details', () => {
    openBookings = [openBooking]
    renderDash()

    expect(screen.getByText(/open bookings you can pick up/i)).toBeInTheDocument()
    expect(screen.getByText(/The Hartleys/)).toBeInTheDocument()
  })

  it('shows a same-day post on the job board, claimable like any other', async () => {
    // D66: same-day bookings used to sit in `same_day_review` waiting on an admin banner that
    // had no buttons — the family was told "we're checking" and never heard back. They are now
    // created as `open`, i.e. a job-board post any nanny can claim. The board query is
    // status in ['open','unmatched'], so a same-day post arrives here like any other, and
    // claiming it must email the family exactly the same way.
    const today = new Date().toISOString().slice(0, 10)
    const sameDayPost = { ...openBooking, id: 'b3', date: today }
    openBookings = [sameDayPost]
    renderDash()

    await userEvent.click(screen.getByRole('button', { name: /accept this booking/i }))

    expect(assignNanny).toHaveBeenCalledWith(
      'b3',
      'n1',
      'Priya Raman',
      // Same meta as any other post — including TODAY's date, the whole point of same-day.
      expect.objectContaining({ ...openAddressable, date: today }),
    )
  })
})
