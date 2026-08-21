import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AdminDashboard } from './AdminDashboard'

// This suite guards ONE bug class on the admin home: a failed OR partial read rendering as a
// confident "nothing needs your attention". The dashboard derives its whole action queue by
// filtering a bounded booking window and counting the result, so a truncated read can hide
// same-day requests and pending applicants behind an all-clear greeting — the D61 failure, and
// exactly the kind of thing that stays live for sessions because nothing tests it.

type Growing = {
  items: unknown[]
  error: Error | null
  truncated: boolean
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
}

const bookings: Growing = blank()
const pendingNannies: Growing = blank()
const pendingFamilies: Growing = blank()
const undeliveredMail: Growing = blank()

function blank(): Growing {
  return {
    items: [],
    error: null,
    truncated: false,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
  }
}

vi.mock('../../hooks/useAdmin', () => ({
  useAllBookings: () => bookings,
  // usePendingApplications is called twice — key the return off the role argument.
  usePendingApplications: (role: 'nanny' | 'family') =>
    role === 'nanny'
      ? { ...pendingNannies, users: pendingNannies.items }
      : { ...pendingFamilies, users: pendingFamilies.items },
  useUndeliveredMail: () => undeliveredMail,
  useAdminActions: () => ({ approve: vi.fn(), reject: vi.fn(), advanceStage: vi.fn() }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { fullName: 'Lucy Adams' } }),
}))

function set(list: Growing, over: Partial<Growing>) {
  Object.assign(list, over)
}

beforeEach(() => {
  Object.assign(bookings, blank())
  Object.assign(pendingNannies, blank())
  Object.assign(pendingFamilies, blank())
  Object.assign(undeliveredMail, blank())
})

describe('AdminDashboard — the queue must never lie about being empty', () => {
  it('says all-clear only when every read SUCCEEDED and returned nothing', () => {
    render(<AdminDashboard />)

    expect(screen.getByText(/nothing needs your attention/i)).toBeInTheDocument()
  })

  it('does NOT say all-clear when a booking read failed', () => {
    set(bookings, { error: new Error('permission-denied') })

    render(<AdminDashboard />)

    expect(screen.queryByText(/nothing needs your attention/i)).not.toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    // The failure surfaces as a load-error notice, not a silent empty state.
    expect(screen.getByText(/loading problem, not an empty list/i)).toBeInTheDocument()
  })

  it('does NOT say all-clear when the queue is empty but a read was truncated', () => {
    // The subtlest case: zero items, no error — but the list was cut short, so "empty" is a
    // conclusion drawn from a page that simply stopped counting.
    set(bookings, { truncated: true, hasMore: true })

    render(<AdminDashboard />)

    expect(screen.queryByText(/nothing needs your attention/i)).not.toBeInTheDocument()
    expect(screen.getByText(/the list is partial/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('a truncated pending-applications read also blocks the all-clear', () => {
    // Same bug, different source list — pending applicants are real people waiting on a
    // decision, so hiding them behind "all clear" is the worst version of it.
    set(pendingNannies, { truncated: true, hasMore: true })

    render(<AdminDashboard />)

    expect(screen.queryByText(/nothing needs your attention/i)).not.toBeInTheDocument()
    expect(screen.getByText(/the list is partial/i)).toBeInTheDocument()
  })

  it('surfaces same-day requests as an alert when bookings are present', () => {
    set(bookings, {
      items: [
        {
          id: 'b1',
          status: 'same_day_review',
          familyName: 'The Hartleys',
          date: '2026-08-12',
          startTime: '15:00',
          endTime: '18:00',
          address: '12 Olive St',
        },
      ],
    })

    render(<AdminDashboard />)

    expect(screen.queryByText(/nothing needs your attention/i)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/same-day booking/i)
    expect(screen.getByText(/The Hartleys/)).toBeInTheDocument()
  })
})

describe('AdminDashboard — every control must actually do something', () => {
  // D66: admin does NOT do matchmaking. The unmatched card carried an "Assign a nanny" button
  // with no onClick — clicking it did nothing, silently. A control that looks live and isn't
  // is worse than no control: Lucy clicks it, believes the family is handled, and moves on.
  // The list itself stays (she still needs to SEE the queue to send her off-platform email);
  // the button that lies does not.

  const unmatched = {
    id: 'b7',
    status: 'unmatched',
    familyName: 'The Ngs',
    date: '2026-08-20',
    startTime: '09:00',
    endTime: '13:00',
    address: '4 Anacapa St',
  }

  it('lists unmatched bookings for awareness', () => {
    set(bookings, { items: [unmatched] })

    render(<AdminDashboard />)

    expect(screen.getByText(/The Ngs/)).toBeInTheDocument()
    expect(screen.getByText(/4 Anacapa St/)).toBeInTheDocument()
  })

  it('offers NO dead "assign a nanny" control on an unmatched booking', () => {
    set(bookings, { items: [unmatched] })

    render(<AdminDashboard />)

    expect(screen.queryByRole('button', { name: /assign a nanny/i })).not.toBeInTheDocument()
  })

  it('the same-day banner stays visible but presents no buttons', () => {
    // Lucy needs to see same-day posts to email nannies off-platform. What she must NOT get
    // is a button implying the platform will route it for her — nannies claim these
    // themselves from their own dashboard now.
    set(bookings, {
      items: [
        {
          id: 'b1',
          status: 'same_day_review',
          familyName: 'The Hartleys',
          date: '2026-08-12',
          startTime: '15:00',
          endTime: '18:00',
          address: '12 Olive St',
        },
      ],
    })

    render(<AdminDashboard />)

    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent(/The Hartleys/)
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument()
  })
})
