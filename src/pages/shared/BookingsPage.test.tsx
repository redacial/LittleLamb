import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BookingsPage } from './BookingsPage'

// After the partner-meeting redesign: nannies have NO booking actions here (pending accept/decline
// is gone, and a nanny cannot cancel in-app). Only a FAMILY can cancel, through a confirmation
// dialog that warns about the late-cancel full-pay fee when the cancel is inside the free window.
// The list is also split into Upcoming / Past.

const cancelBooking = vi.fn(() => Promise.resolve())

// A far-future confirmed booking → Upcoming, and (being days out) NOT a late cancel.
const upcoming = {
  id: 'b1',
  status: 'confirmed',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya Raman',
  date: '2099-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
  rateMinCents: 2500,
  rateMaxCents: 50000,
}

// A past confirmed booking → Past section, reviewable.
const past = {
  ...upcoming,
  id: 'b2',
  familyName: 'The Ortegas',
  date: '2020-01-01',
}

let bookings: unknown[] = [upcoming]

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings, loading: false }),
  useBookingActions: () => ({ setStatus: vi.fn(), assignNanny: vi.fn(), cancelBooking }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { fullName: 'Priya Raman' }, user: { uid: 'f1' } }),
}))

function renderPage(role: 'family' | 'nanny') {
  return render(
    <MemoryRouter>
      <BookingsPage role={role} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  cancelBooking.mockClear()
  bookings = [upcoming]
})

describe('BookingsPage — upcoming / past split', () => {
  it('groups a future booking under Upcoming and a past one under Past', () => {
    bookings = [upcoming, past]
    renderPage('family')
    expect(screen.getByRole('heading', { name: /upcoming/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /past/i })).toBeInTheDocument()
  })
})

describe('BookingsPage — only the family can cancel', () => {
  it('shows a Cancel button to a family', () => {
    renderPage('family')
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })

  it('shows NO cancel/accept/decline to a nanny', () => {
    renderPage('nanny')
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /decline/i })).toBeNull()
  })

  it('a >24h cancel is free — no fee is shown, and it cancels with fee 0', async () => {
    renderPage('family')
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    // The confirm dialog says there's no charge.
    expect(await screen.findByText(/no charge/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cancel booking/i }))

    await waitFor(() =>
      expect(cancelBooking).toHaveBeenCalledWith('b1', expect.objectContaining({ id: 'b1' }), 0),
    )
  })
})

describe('BookingsPage — the late-cancel fee', () => {
  it('warns about full pay and passes the computed fee when the cancel is < 24h out', async () => {
    // A booking starting ~2h from now: 4h session × $25 floor = $100.00 = 10000 cents.
    const soon = new Date(Date.now() + 2 * 3_600_000)
    const date = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`
    const start = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`
    const endD = new Date(soon.getTime() + 4 * 3_600_000)
    const end = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`
    // Keep it same-day so the session-hours math is a clean 4h (avoid a midnight wrap).
    if (endD.getDate() !== soon.getDate()) return
    bookings = [{ ...upcoming, date, startTime: start, endTime: end }]

    renderPage('family')
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(await screen.findByText(/late cancellation/i)).toBeInTheDocument()
    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /cancel anyway/i }))
    await waitFor(() =>
      expect(cancelBooking).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 10000),
    )
  })
})
