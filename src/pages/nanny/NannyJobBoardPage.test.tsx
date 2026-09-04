import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NannyJobBoardPage } from './NannyJobBoardPage'

// The Job Board is where every unclaimed booking lands now that pending/accept-decline is gone:
// last-minute (<25h), out-of-hours, and rate-mismatch requests. This file carries the claim
// regression coverage that used to live on the dashboard:
//
//  • BUG 5 (the worst dead-email call site): assignNanny's email branch is guarded on receiving
//    booking `meta`; an open post has no nanny attached, so open_booking_picked_up is the ONLY
//    thing that tells the family anyone is coming. Passing the meta is the page's job.
//  • The RACE: assignNanny REJECTS when the post was already claimed. The losing nanny must be
//    told she lost — swallowing that rejection leaves a dead card she taps forever.

const assignNanny = vi.fn(() => Promise.resolve())

const openBooking = {
  id: 'b2',
  status: 'open',
  familyId: 'f2',
  familyName: 'The Hartleys',
  nannyId: null,
  nannyName: null,
  date: '2099-09-06',
  startTime: '09:00',
  endTime: '13:00',
  address: '12 Olive St, Santa Barbara, CA',
}

let openBookings: unknown[] = []

vi.mock('../../hooks/useBookings', () => ({
  useOpenBookings: () => openBookings,
  useBookingActions: () => ({ assignNanny }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { fullName: 'Priya Raman' }, user: { uid: 'n1' } }),
}))

function renderBoard() {
  return render(
    <MemoryRouter>
      <NannyJobBoardPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  assignNanny.mockClear()
  openBookings = []
})

describe('NannyJobBoardPage — listing', () => {
  it('shows an empty state when there are no open posts', () => {
    renderBoard()
    expect(screen.getByText(/no open bookings/i)).toBeInTheDocument()
  })

  it('surfaces an open post with its details', () => {
    openBookings = [openBooking]
    renderBoard()
    expect(screen.getByText(/The Hartleys/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept this booking/i })).toBeInTheDocument()
  })

  it('shows a same-day post, claimable like any other', async () => {
    // Same-day bookings are created as `open` and arrive on the board like any other post.
    const today = new Date().toISOString().slice(0, 10)
    openBookings = [{ ...openBooking, id: 'b3', date: today }]
    renderBoard()
    expect(screen.getByRole('button', { name: /accept this booking/i })).toBeInTheDocument()
  })
})

describe('NannyJobBoardPage — claiming a post must be able to send mail', () => {
  const openAddressable = {
    familyId: 'f2',
    familyName: 'The Hartleys',
    date: '2099-09-06',
    startTime: '09:00',
    endTime: '13:00',
    address: '12 Olive St, Santa Barbara, CA',
  }

  it('passes the booking meta so the family can be told a nanny is coming', async () => {
    openBookings = [openBooking]
    renderBoard()

    await userEvent.click(screen.getByRole('button', { name: /accept this booking/i }))

    expect(assignNanny).toHaveBeenCalledWith(
      'b2',
      'n1',
      'Priya Raman',
      expect.objectContaining(openAddressable),
    )
  })
})

describe('NannyJobBoardPage — a failed claim must never look like a no-op', () => {
  it('tells the nanny she LOST THE RACE when the post was already claimed', async () => {
    openBookings = [openBooking]
    assignNanny.mockRejectedValueOnce(new Error('already-claimed'))
    renderBoard()

    await userEvent.click(screen.getByRole('button', { name: /accept this booking/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/another nanny/i)
  })

  it('disables the button while the claim is in flight', async () => {
    openBookings = [openBooking]
    let release: () => void = () => {}
    assignNanny.mockImplementationOnce(() => new Promise<void>((res) => { release = () => res() }))
    renderBoard()

    const btn = screen.getByRole('button', { name: /accept this booking/i })
    await userEvent.click(btn)

    await waitFor(() => expect(btn).toBeDisabled())
    release()
    await waitFor(() => expect(btn).not.toBeDisabled())
  })
})
