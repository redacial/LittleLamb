import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyDashboard } from './NannyDashboard'

// The pending/accept-decline flow was removed (partner meeting 2026-09), and claiming open posts
// moved to the Job Board tab (NannyJobBoardPage). So the dashboard no longer performs any booking
// action — it summarizes. What it must still do: surface the Job Board with a live count and link
// to it. The claim behaviour (and its regression coverage — dead-email call site, lost-race
// message) now lives in NannyJobBoardPage.test.tsx.

const upcomingBooking = {
  id: 'b1',
  status: 'confirmed',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2099-09-04',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr, Santa Barbara, CA',
}

let openBookings: unknown[] = []

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings: [upcomingBooking], loading: false }),
  useOpenBookings: () => openBookings,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { fullName: 'Priya Raman' }, user: { uid: 'n1' } }),
}))

function renderDash() {
  return render(
    <MemoryRouter>
      <NannyDashboard />
    </MemoryRouter>,
  )
}

describe('NannyDashboard — the Job Board summary', () => {
  it('shows the open-booking count and links to the Job Board tab', () => {
    openBookings = [{ id: 'b2' }, { id: 'b3' }]
    renderDash()

    // The count card is a link to /nanny/job-board.
    const link = screen.getByRole('link', { name: /job board/i })
    expect(link).toHaveAttribute('href', '/nanny/job-board')
    expect(link).toHaveTextContent('2')
  })

  it('no longer renders any accept / decline / claim controls', () => {
    openBookings = [{ id: 'b2', familyName: 'The Hartleys' }]
    renderDash()

    // Pending accept/decline is gone entirely; claiming happens on the Job Board page.
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /decline/i })).toBeNull()
  })
})
