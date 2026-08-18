import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminBookingsPage } from './AdminBookingsPage'

// BUG 2 at the admin call site. The admin Cancel button called setStatus(id, 'cancelled')
// with no meta, so an admin override cancelled the booking in Firestore and told nobody —
// the nanny kept a live calendar hold for a session that no longer existed.

const setStatus = vi.fn(() => Promise.resolve())

const booking = {
  id: 'b1',
  status: 'confirmed',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

vi.mock('../../hooks/useAdmin', () => ({
  useAllBookings: () => ({
    items: [booking],
    error: null,
    truncated: false,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
  }),
  useUsersByRole: () => ({ users: [], items: [], error: null, truncated: false }),
}))

vi.mock('../../hooks/useNannies', () => ({
  useNannyDirectory: () => ({ nannies: [], loading: false, error: null, truncated: false }),
}))

vi.mock('../../hooks/useBookings', () => ({
  useBookingActions: () => ({ setStatus, assignNanny: vi.fn() }),
  createBooking: vi.fn(() => Promise.resolve('b2')),
}))

beforeEach(() => {
  setStatus.mockClear()
})

describe('AdminBookingsPage — an admin cancel must be able to send mail', () => {
  it('CANCEL passes the booking meta and marks the admin as the actor', async () => {
    render(<AdminBookingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(setStatus).toHaveBeenCalledWith(
      'b1',
      'cancelled',
      expect.objectContaining({
        familyId: 'f1',
        familyName: 'The Ortegas',
        nannyId: 'n1',
        nannyName: 'Priya',
        date: '2026-09-04',
        startTime: '15:00',
        endTime: '19:00',
        address: '5 Cliff Dr, Santa Barbara, CA',
      }),
      'admin',
    )
  })
})
